import {spawn} from 'node:child_process';
import type {ChildProcess} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';
import {once} from 'node:events';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedPlayFixture} from '../tests/fixtures/play.ts';

const runId=randomUUID();
const email=`e2e-${runId}@example.invalid`;
const password='TalentLink-http-test-2026';
const base='http://127.0.0.1:4387';
const directory=path.join('.local',`e2e-${runId}`);
let server:ChildProcess|undefined;
let stage='initialisation';
let playGameId='';
const errors:string[]=[];
let serverOutput='';
async function stop(){
 if(!server?.pid||server.exitCode!==null)return;
 const exited=once(server,'exit').then(()=>true);
 if(server.connected)server.send('shutdown');else server.kill('SIGTERM');
 const stopped=await Promise.race([exited,pause(10_000).then(()=>false)]);
 if(!stopped){server.kill();throw new Error('Test server did not stop')}
}
async function post(action:string,input:unknown,cookie='',origin=base){
 return fetch(`${base}/api/v1/auth/${action}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(input),signal:AbortSignal.timeout(30_000)});
}
async function current(cookie:string){return fetch(`${base}/api/v1/auth/session`,{headers:{cookie},signal:AbortSignal.timeout(30_000)})}
async function mailToken(subject:string,recipient=email){
 const files=await readdir('.local/mail');
 for(const file of files){if(!file.endsWith('.json'))continue;const message=JSON.parse(await readFile(path.join('.local/mail',file),'utf8'));if(message.to===recipient&&message.subject.includes(subject)){const token=message.text.match(/#token=([a-f0-9]{64})/);if(token)return token[1] as string}}
 throw new Error('Synthetic mail not found');
}
try{
 try{await fetch(base,{signal:AbortSignal.timeout(500)});throw new Error('Test port already in use')}catch(error){if(error instanceof Error&&error.message==='Test port already in use')throw error}
 await mkdir('.local',{recursive:true});
 stage='base de test';const db=await embeddedDatabase(directory);try{await migrate(db);playGameId=(await seedPlayFixture(db)).gameId}finally{await db.close()}
 stage='serveur Next.js';
 server=spawn(process.execPath,['scripts/e2e-server.ts'],{
  windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,DB_DRIVER:'pglite',PGLITE_PATH:directory,
    AUTH_ENABLED:'true',AUTH_REGISTRATION_ENABLED:'true',AUTH_SECRET:randomBytes(32).toString('hex'),APP_URL:base,MAIL_DRIVER:'file',PLAY_ENABLED:'true',NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'},
 });
 server.stderr?.on('data',chunk=>{serverOutput=(serverOutput+String(chunk)).slice(-4000);if(String(chunk).includes('talentlink_auth_error'))errors.push('auth_error')});
 server.stdout?.on('data',chunk=>{serverOutput=(serverOutput+String(chunk)).slice(-4000)});
 const deadline=Date.now()+120_000;
 let ready=false;
 while(Date.now()<deadline){if(server.exitCode!==null)throw new Error('Test server exited before readiness');try{const response=await fetch(`${base}/api/v1/auth/config`,{signal:AbortSignal.timeout(3000)});if(response.ok&&(await response.json()).enabled){ready=true;break}}catch{}await pause(300)}
 if(!ready)console.error(serverOutput);
 assert.ok(ready,'Next.js API did not become ready');
 stage='parcours HTTP';
 const health=await fetch(`${base}/api/health/`);assert.equal(health.status,200);assert.deepEqual(await health.json(),{status:'ok'});assert.equal(health.headers.get('cache-control'),'no-store');
 const playPost=(action:string,data:unknown,cookie='',origin=base)=>fetch(`${base}/api/v1/play/${action}/`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 const catalog=await fetch(`${base}/api/v1/play/catalog/`);assert.equal(catalog.status,200);const catalogBody=await catalog.json();assert.equal(catalogBody.total,1);assert.ok(!JSON.stringify(catalogBody).includes('correct_index'));
 assert.equal((await playPost('start',{gameId:playGameId},'','https://evil.invalid')).status,403);
 const started=await playPost('start',{gameId:playGameId});assert.equal(started.status,201);assert.match(started.headers.get('set-cookie')!,/HttpOnly/);
 const playCookie=started.headers.get('set-cookie')!.split(';')[0],attemptId=(await started.json()).id;
 const initial=await fetch(`${base}/api/v1/play/state/?id=${attemptId}`,{headers:{cookie:playCookie}});const initialBody=await initial.json();assert.equal(initialBody.question.options.length,3);assert.ok(!JSON.stringify(initialBody).includes('correctIndex'));
 assert.equal((await fetch(`${base}/api/v1/play/state/?id=${attemptId}`)).status,404);
 for(let index=0;index<3;index++){const response=await playPost('answer',{attemptId,index,choice:index},playCookie);assert.equal(response.status,200);const feedback=await response.json();assert.equal(feedback.points,10);assert.ok(feedback.explanation)}
 assert.equal((await playPost('answer',{attemptId,index:0,choice:0,points:999},playCookie)).status,400);
 assert.equal((await playPost('answer',{attemptId,index:0,choice:0},playCookie)).status,200);
 const completed=await(await fetch(`${base}/api/v1/play/state/?id=${attemptId}`,{headers:{cookie:playCookie}})).json();assert.equal(completed.score,30);assert.equal(completed.completed,true);assert.equal(completed.percentage,100);
 assert.equal((await fetch(`${base}/play/`)).status,200);assert.equal((await fetch(`${base}/play/${playGameId}/`)).status,200);
 assert.equal((await post('register',{email,password,role:'admin',adultConfirmed:true,termsAccepted:true,privacyAccepted:true})).status,400);
 assert.equal((await post('register',{},'','https://other.invalid')).status,403);
 assert.equal((await post('register',{email,password,role:'mentee',adultConfirmed:true,termsAccepted:true,privacyAccepted:true})).status,202);
 assert.equal((await post('login',{email,password})).status,403);
 assert.equal((await post('verify-email',{token:await mailToken('Vérifiez')})).status,200);
 const logged=await post('login',{email,password});assert.equal(logged.status,200);
 const cookie=logged.headers.get('set-cookie')!.split(';')[0];assert.match(logged.headers.get('set-cookie')!,/HttpOnly/);
 assert.equal((await(await current(cookie)).json()).account.email,email);
 const mentorEmail=`mentor-${runId}@example.invalid`;
 assert.equal((await post('register',{email:mentorEmail,password,role:'mentor',adultConfirmed:true,termsAccepted:true,privacyAccepted:true,mentorCharterAccepted:true})).status,202);
 assert.equal((await post('verify-email',{token:await mailToken('Vérifiez',mentorEmail)})).status,200);
 const mentorLogin=await post('login',{email:mentorEmail,password});assert.equal(mentorLogin.status,200);
 const mentorCookie=mentorLogin.headers.get('set-cookie')!.split(';')[0];
 const mpost=(action:string,input:unknown,session=mentorCookie,origin=base)=>fetch(`${base}/api/v1/mentoring/${action}/`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie:session},body:JSON.stringify(input)});
 const draft={publicName:'Mentor HTTP synthétique',biography:'Biographie de test exclusivement synthétique pour le parcours HTTP.',experience:'Expérience fictive réservée à la vérification automatique.',skills:['Communication'],expertise:['Orientation'],languages:['Français'],generalLocation:'Conakry',availability:'Samedi',formats:['online'],professionalLinks:[],revision:0};
 assert.equal((await mpost('own-profile',draft,mentorCookie,'https://evil.invalid')).status,403);
 assert.equal((await mpost('own-profile',draft,cookie)).status,403);
 assert.equal((await mpost('own-profile',{...draft,verification_status:'verified'})).status,400);
 assert.equal((await mpost('own-profile',draft)).status,200);
 const own=await fetch(`${base}/api/v1/mentoring/own-profile/`,{headers:{cookie:mentorCookie}});assert.equal(own.status,200);
 const profile=(await own.json()).profile;
 assert.equal((await fetch(`${base}/api/v1/mentoring/profile/?id=${profile.user_id}`)).status,404);
 assert.equal((await fetch(`${base}/api/v1/mentoring/own-profile/`)).status,401);
 assert.equal((await mpost('submit',{revision:profile.revision})).status,200);
 assert.equal((await fetch(`${base}/api/v1/mentoring/reviews/`,{headers:{cookie:mentorCookie}})).status,403);
 const directoryResponse=await fetch(`${base}/api/v1/mentoring/directory/?q=synthétique`);assert.equal(directoryResponse.status,200);assert.equal((await directoryResponse.json()).total,0);
 assert.equal((await mpost('request',{mentorId:profile.user_id,goal:'Un objectif synthétique de test pour le parcours HTTP.'},cookie)).status,403);
 for(const page of ['mentors','compte/profil-mentor','compte/mentorat','administration/mentors'])assert.equal((await fetch(`${base}/${page}/`)).status,200);
 assert.equal((await fetch(`${base}/auth/connexion/`)).status,200);
 assert.equal((await fetch(`${base}/compte/`)).status,200);
 assert.equal((await fetch(`${base}/page-absente/`)).status,404);
 assert.equal((await post('forgot-password',{email})).status,202);
 assert.equal((await post('reset-password',{token:await mailToken('Réinitialisez'),password:'TalentLink-http-updated-2026'})).status,200);
 assert.equal((await current(cookie)).status,401);
 assert.equal((await post('login',{email,password})).status,401);
 const renewed=await post('login',{email,password:'TalentLink-http-updated-2026'});assert.equal(renewed.status,200);
 const renewedCookie=renewed.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await post('logout',{},renewedCookie)).status,200);assert.equal((await current(renewedCookie)).status,401);
 for(let n=0;n<5;n++)assert.equal((await post('resend-verification',{email:'absent-e2e@example.invalid'})).status,202);
 const limited=await post('resend-verification',{email:'absent-e2e@example.invalid'});assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'900');
 assert.deepEqual(errors,[]);
 await writeFile('.local/last-e2e.json',JSON.stringify({directory,email,password:'TalentLink-http-updated-2026'}),{mode:0o600});
 console.log('E2E HTTP Next.js : parcours complet, pages, CSRF, révocation et limitation vérifiés sur une base isolée.');
}catch(error){
 console.error(error instanceof assert.AssertionError?`E2E : ${error.message}`:`E2E : échec à l’étape ${stage} (${error instanceof Error?error.name:'erreur'}).`);process.exitCode=1;
}finally{await stop()}
