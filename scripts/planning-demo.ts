import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {hashPassword} from '../src/modules/identity/crypto.ts';
import {seedMessagingFixture} from '../tests/fixtures/messaging.ts';
import {PlanningService} from '../src/modules/planning/service.ts';
const base='http://127.0.0.1:4394',directory='.local/planning-demo-'+randomUUID(),password='TalentLink-planning-demo-2026';
try{await fetch(base,{signal:AbortSignal.timeout(500)});throw new Error('Port 4394 already used')}catch(e){if(e instanceof Error&&e.message==='Port 4394 already used')throw e}
await mkdir('.local',{recursive:true});const db=await embeddedDatabase(directory);
try{await migrate(db);const f=await seedMessagingFixture(db,await hashPassword(password)),s=new PlanningService(db,true,true);
 await s.propose(f.mentor,{programId:f.programId,clientId:randomUUID(),title:'Séance fictive : clarifier mon projet',startsAt:new Date(Date.now()+86400000).toISOString(),durationMinutes:45});
 await s.objective(f.mentor,{programId:f.programId,clientId:randomUUID(),title:'Identifier trois formations adaptées — objectif fictif',dueDate:null});
 await writeFile('.local/last-planning-demo.json',JSON.stringify({directory,programId:f.programId}),{mode:0o600});
}finally{await db.close()}
const server=spawn(process.execPath,['scripts/e2e-server.ts'],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,DB_DRIVER:'pglite',PGLITE_PATH:directory,
 APP_URL:base,TEST_SERVER_PORT:'4394',AUTH_SECRET:randomBytes(32).toString('hex'),AUTH_ENABLED:'true',AUTH_REGISTRATION_ENABLED:'false',REAL_ACCOUNTS_APPROVED:'false',
 MENTORING_ENABLED:'true',MESSAGING_ENABLED:'false',PLANNING_ENABLED:'true',PRIVATE_COMMUNICATIONS_APPROVED:'false',PLAY_ENABLED:'false',NEXT_PUBLIC_DEMO_MODE:'planning',
 MAIL_DRIVER:'file',DATABASE_URL:'',SMTP_URL:'',MESSAGING_RESEND_API_KEY:'',NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'}});
server.stdout?.on('data',()=>{});server.stderr?.on('data',()=>{});
process.on('SIGINT',()=>{if(server.connected)server.send('shutdown')});process.on('SIGTERM',()=>{if(server.connected)server.send('shutdown')});const end=once(server,'exit');let ready=false;
for(let i=0;i<120;i++){if(server.exitCode!==null)break;try{const r=await fetch(base+'/api/v1/planning/config/',{signal:AbortSignal.timeout(1500)});if(r.ok&&(await r.json()).enabled){ready=true;break}}catch{}await pause(500)}
if(ready)console.log('Démonstration locale isolée : '+base+'/auth/connexion/\nComptes fictifs : mentor-messaging@example.invalid, mentee-messaging@example.invalid, moderation-messaging@example.invalid\nMot de passe de démonstration uniquement : '+password);
else{console.error('Démonstration indisponible.');if(server.connected)server.send('shutdown');process.exitCode=1}
await end;
