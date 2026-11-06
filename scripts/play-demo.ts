import {spawn} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedPlayFixture} from '../tests/fixtures/play.ts';
const base='http://127.0.0.1:4392',directory='.local/play-demo-'+randomUUID();
try{await fetch(base,{signal:AbortSignal.timeout(500)});throw new Error('Port 4392 already used')}catch(e){if(e instanceof Error&&e.message==='Port 4392 already used')throw e}
await mkdir('.local',{recursive:true});const db=await embeddedDatabase(directory);let gameId:string;
try{await migrate(db);gameId=(await seedPlayFixture(db)).gameId}finally{await db.close()}
await writeFile('.local/last-play-demo.json',JSON.stringify({directory,gameId}),{mode:0o600});
const server=spawn(process.execPath,['scripts/e2e-server.ts'],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,DB_DRIVER:'pglite',PGLITE_PATH:directory,
 APP_URL:base,TEST_SERVER_PORT:'4392',AUTH_SECRET:randomBytes(32).toString('hex'),AUTH_ENABLED:'false',AUTH_REGISTRATION_ENABLED:'false',REAL_ACCOUNTS_APPROVED:'false',MENTORING_ENABLED:'false',PLAY_ENABLED:'true',
 MAIL_DRIVER:'file',DATABASE_URL:'',SMTP_URL:'',MESSAGING_RESEND_API_KEY:'',NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'}});
server.stdout?.on('data',()=>{});server.stderr?.on('data',()=>{});
process.on('SIGINT',()=>{if(server.connected)server.send('shutdown')});process.on('SIGTERM',()=>{if(server.connected)server.send('shutdown')});
const end=once(server,'exit');
let ready=false;
for(let i=0;i<120;i++){if(server.exitCode!==null)break;try{const r=await fetch(base+'/api/v1/play/config/',{signal:AbortSignal.timeout(1500)});if(r.ok&&(await r.json()).enabled){ready=true;break}}catch{}await pause(500)}
if(ready)console.log('Démonstration locale isolée, sans compte réel ni SMTP : '+base+'/play/'+gameId+'/');
else{console.error('Démonstration indisponible.');if(server.connected)server.send('shutdown');process.exitCode=1}
await end;
