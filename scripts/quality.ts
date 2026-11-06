import {REGISTRATION_RULES_VERSION} from '../src/content/registration.ts';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {get} from 'node:http';
import {gzipSync,gunzipSync,brotliDecompressSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4395';
async function read(path:string):Promise<{body:Buffer;wireBytes:number;headers:Record<string,unknown>;status:number}>{
 const url=new URL(path,base);assert.equal(url.origin,base,'Only the isolated local server is permitted');
 return new Promise((resolve,reject)=>{const req=get(url,{headers:{'Accept-Encoding':'gzip'}},response=>{const chunks:Buffer[]=[];response.on('data',c=>chunks.push(Buffer.from(c)));response.on('error',reject);response.on('end',()=>{try{const raw=Buffer.concat(chunks),encoding=response.headers['content-encoding'];resolve({body:encoding==='gzip'?gunzipSync(raw):encoding==='br'?brotliDecompressSync(raw):raw,wireBytes:raw.length,headers:response.headers,status:response.statusCode||0})}catch(e){reject(e)}})});req.setTimeout(20_000,()=>req.destroy(new Error('Quality request timeout')));req.on('error',reject)});
}
try{await read('/api/health/');throw new Error('Quality port already used')}catch(e){if(e instanceof Error&&e.message==='Quality port already used')throw e}
const server=spawn(process.execPath,['scripts/e2e-server.ts','--production'],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,NODE_ENV:'production',TEST_SERVER_PORT:'4395',AUTH_ENABLED:'false',AUTH_REGISTRATION_ENABLED:'false',REAL_ACCOUNTS_APPROVED:'false',MENTORING_ENABLED:'false',PLAY_ENABLED:'false',PLANNING_ENABLED:'false',MESSAGING_ENABLED:'false',PRIVATE_COMMUNICATIONS_APPROVED:'false',ATTESTATIONS_ENABLED:'false',ATTESTATIONS_APPROVED:'false',DATABASE_URL:'',AUTH_SECRET:'',MAIL_DRIVER:'',MAIL_FROM:'',SMTP_URL:'',DB_DRIVER:'postgres',APP_URL:'',NEXT_TELEMETRY_DISABLED:'1'}});
let logs='';server.stdout?.on('data',c=>{logs=(logs+String(c)).slice(-2000)});server.stderr?.on('data',c=>{logs=(logs+String(c)).slice(-2000)});
try{
 let ready=false;for(let i=0;i<90;i++){if(server.exitCode!==null)throw Error('Quality server exited');try{if((await read('/api/health/')).status===200){ready=true;break}}catch{}await pause(300)}assert.ok(ready,'Quality server did not become ready');
 const paths=['/','/auth/connexion/','/compte/','/mentors/','/play/','/compte/messages/','/compte/planning/','/administration/','/compte/attestations/','/administration/attestations/'];
 const cache=new Map<string,Awaited<ReturnType<typeof read>>>(),report=[];
 for(const path of paths){const page=await read(path),html=page.body.toString();assert.equal(page.status,200,path);assert.match(html,/<html[^>]*lang="fr"/);assert.equal([...html.matchAll(/<main(?:\s|>)/g)].length,1,path+' must have one main landmark');assert.match(html,/Aller au contenu/);const skip=html.match(/<a[^>]*class="skip"[^>]*href="#([^"]+)"/);assert.ok(skip,path+' must have a skip link');assert.equal(html.split('id="'+skip[1]+'"').length-1,1,path+' must have one skip destination');assert.equal(page.headers['x-content-type-options'],'nosniff');
  const assets=new Set<string>();for(const tag of html.matchAll(/<(?:script|link)\b[^>]*>/g)){if(tag[0].startsWith('<link')&&!/rel="stylesheet"/.test(tag[0]))continue;const target=tag[0].match(/(?:src|href)="([^"#]+)"/);if(target){const url=new URL(target[1].replaceAll('&amp;','&'),base);assert.equal(url.origin,base,'No external initial script/style dependency');if(url.pathname.startsWith('/_next/static/'))assets.add(url.pathname+url.search)}}
  let gzipBytes=gzipSync(page.body).length,wireBytes=page.wireBytes,jsGzip=0,cssGzip=0;
  for(const asset of assets){if(!cache.has(asset))cache.set(asset,await read(asset));const r=cache.get(asset)!;assert.equal(r.status,200,asset);assert.match(String(r.headers['cache-control']),/immutable/);const compressed=gzipSync(r.body).length;gzipBytes+=compressed;wireBytes+=r.wireBytes;if(asset.includes('.js'))jsGzip+=compressed;if(asset.includes('.css'))cssGzip+=compressed;}
  assert.ok(gzipBytes<=250*1024,path+' exceeds the 250 KiB initial HTML/JS/CSS gzip budget');assert.ok(jsGzip<=200*1024,path+' exceeds the 200 KiB JS gzip budget');assert.ok(cssGzip<=30*1024,path+' exceeds the 30 KiB CSS gzip budget');
  report.push({path,initialAssets:assets.size,htmlGzipBytes:gzipSync(page.body).length,jsGzipBytes:jsGzip,cssGzipBytes:cssGzip,totalEstimatedGzipBytes:gzipBytes,localWireBytes:wireBytes,idealTransferSecondsAt400Kbps:Number((gzipBytes*8/400000).toFixed(2))});
 }
 const adultPolicy=await read('/inscriptions-adultes/');assert.equal(adultPolicy.status,200);assert.ok(adultPolicy.body.toString().includes(REGISTRATION_RULES_VERSION));assert.match(adultPolicy.body.toString(),/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/);
 const editorialSource=await read('/editorial/launch-quizzes.v1.json');assert.equal(editorialSource.status,404,'Editorial answer file must never be public');
 const privateApi=await read('/api/v1/auth/session/');assert.equal(privateApi.headers['referrer-policy'],'no-referrer');assert.equal(privateApi.headers['cache-control'],'no-store');
 await mkdir('.local',{recursive:true});await writeFile('.local/quality-report.json',JSON.stringify({measuredAt:new Date().toISOString(),scope:'Production HTML and initial referenced JS/CSS; accounts and all private features closed; no browser execution.',limits:{totalGzipKiB:250,jsGzipKiB:200,cssGzipKiB:30},networkModel:'Ideal transfer at 400 kilobits/s, excluding RTT, parsing, execution, API data, images and subsequent navigation. Not a browser performance measurement.',routes:report},null,2));
 console.table(report.map(r=>({route:r.path,assets:r.initialAssets,gzipKiB:Math.round(r.totalEstimatedGzipBytes/102.4)/10,ideal400KbpsSeconds:r.idealTransferSecondsAt400Kbps})));console.log('Quality HTTP: French, main landmark, skip destination, private headers, immutable assets and initial resource budgets passed. Browser accessibility and real network performance remain separate checks.');
}catch(e){console.error(e instanceof Error?e.message:'Quality check failed');process.exitCode=1}
finally{if(server.exitCode===null){const ended=once(server,'exit').then(()=>true);if(server.connected)server.send('shutdown');else server.kill();if(!await Promise.race([ended,pause(10_000).then(()=>false)])){server.kill();process.exitCode=1}}}
