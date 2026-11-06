import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {hashPassword} from '../src/modules/identity/crypto.ts';
import {seedPlayFixture} from '../tests/fixtures/play.ts';
const base='http://127.0.0.1:4396',directory='.local/public-check-'+randomUUID(),password='Synthetic-public-check-2026';
try{await fetch(base,{signal:AbortSignal.timeout(500)});throw Error('Public test port already used')}catch(e){if(e instanceof Error&&e.message==='Public test port already used')throw e}
await mkdir('.local',{recursive:true});const db=await embeddedDatabase(directory);let gameId='';try{await migrate(db);gameId=(await seedPlayFixture(db)).gameId;await db.query("INSERT INTO app_user(email,password_hash,role,email_verified_at) VALUES('admin-public@example.invalid',$1,'admin',now())",[await hashPassword(password)])}finally{await db.close()}
const server=spawn(process.execPath,['scripts/e2e-server.ts'],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,NODE_ENV:'development',TEST_SERVER_PORT:'4396',DB_DRIVER:'pglite',PGLITE_PATH:directory,APP_URL:base,AUTH_SECRET:randomBytes(32).toString('hex'),AUTH_ENABLED:'true',REAL_ACCOUNTS_APPROVED:'false',AUTH_REGISTRATION_ENABLED:'false',PLAY_ENABLED:'true',MENTORING_ENABLED:'false',MESSAGING_ENABLED:'false',PLANNING_ENABLED:'false',PRIVATE_COMMUNICATIONS_APPROVED:'false',ATTESTATIONS_ENABLED:'false',ATTESTATIONS_APPROVED:'false',MAINTENANCE_ENABLED:'false',CRON_SECRET:'',NEXT_PUBLIC_SITE_PHASE:'public-discovery',MAIL_DRIVER:'file',DATABASE_URL:'',SMTP_URL:'',MESSAGING_RESEND_API_KEY:'',NEXT_TELEMETRY_DISABLED:'1'}});
server.stdout?.on('data',()=>{});server.stderr?.on('data',()=>{});
try{let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)break;try{if((await fetch(base+'/api/health/',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}await pause(400)}assert.ok(ready);
 const post=(action:string,input:unknown,cookie='')=>fetch(base+action,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',cookie},body:JSON.stringify(input)});
 const config=await(await fetch(base+'/api/v1/auth/config/')).json();assert.deepEqual(config,{enabled:true,registrationEnabled:false});
 assert.equal((await post('/api/v1/auth/register/',{email:'blocked-public@example.invalid',password,role:'mentee',adultConfirmed:true,termsAccepted:true,privacyAccepted:true})).status,403);
 assert.equal((await fetch(base+'/api/v1/administration/overview/')).status,401);
 const login=await post('/api/v1/auth/login/',{email:'admin-public@example.invalid',password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];assert.equal((await fetch(base+'/api/v1/administration/overview/',{headers:{cookie}})).status,200);
 assert.equal((await fetch(base+'/api/v1/mentoring/directory/')).status,200);assert.equal((await fetch(base+'/api/v1/play/catalog/')).status,200);
 const start=await post('/api/v1/play/start/',{gameId,saveHistory:false});assert.equal(start.status,201);const attempt=await start.json(),playCookie=start.headers.get('set-cookie')!.split(';')[0];assert.equal((await post('/api/v1/play/answer/',{attemptId:attempt.id,index:0,choice:0},playCookie)).status,200);
 assert.deepEqual(await(await fetch(base+'/api/v1/messaging/config/')).json(),{enabled:false,sendEnabled:false});assert.deepEqual(await(await fetch(base+'/api/v1/planning/config/')).json(),{enabled:false,sendEnabled:false});assert.deepEqual(await(await fetch(base+'/api/v1/attestations/config/')).json(),{enabled:false});
 const home=await(await fetch(base+'/')).text();assert.ok(home.includes('Lancement découverte'));const privacy=await(await fetch(base+'/confidentialite/')).text();assert.ok(privacy.includes('TalentLink Group'));assert.ok(privacy.includes('+224 625 59 51 69'));assert.ok(!privacy.includes('asbangoura.akb@gmail.com'));
 console.log('Découverte publique HTTP : visiteur, annuaire, quiz sans compte, inscription fermée, connexion existante, administration protégée et fonctions privées fermées vérifiés sur données fictives isolées.');
}catch(e){console.error(e instanceof Error?e.message:'Public smoke failed');process.exitCode=1}finally{if(server.exitCode===null){const ended=once(server,'exit').then(()=>true);if(server.connected)server.send('shutdown');else server.kill();if(!await Promise.race([ended,pause(10_000).then(()=>false)])){server.kill();process.exitCode=1}}}
