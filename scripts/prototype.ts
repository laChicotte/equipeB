import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedPrototype,prototypePassword} from './prototype-seed.ts';
const port=4399,base='http://127.0.0.1:'+port,directory='.local/full-prototype',marker='.local/full-prototype.json';
if(process.env.NODE_ENV==='production')throw Error('Prototype local uniquement');
try{await fetch(base,{signal:AbortSignal.timeout(700)});throw Error('Port prototype déjà utilisé')}catch(e){if(e instanceof Error&&e.message==='Port prototype déjà utilisé')throw e}
await mkdir('.local',{recursive:true});const previous=await readFile(marker,'utf8').then(JSON.parse).catch(()=>null);
const db=await embeddedDatabase(directory);try{await migrate(db);if(!previous){const [count]=await db.query<{n:number}>('SELECT count(*)::integer AS n FROM app_user');if(count.n)throw Error('Base prototype déjà remplie : ne pas réinitialiser automatiquement');await seedPrototype(db);await writeFile(marker,JSON.stringify({directory,seededAt:new Date().toISOString(),synthetic:true}),{mode:0o600})}}finally{await db.close()}
const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'development',DB_DRIVER:'pglite',PGLITE_PATH:directory,DATABASE_URL:'',APP_URL:base,TEST_SERVER_PORT:String(port),AUTH_SECRET:randomBytes(32).toString('hex'),AUTH_ENABLED:'true',AUTH_REGISTRATION_ENABLED:'true',ADULT_REGISTRATION_APPROVED:'false',REAL_ACCOUNTS_APPROVED:'false',PLAY_ENABLED:'true',MENTORING_ENABLED:'true',MESSAGING_ENABLED:'true',PLANNING_ENABLED:'true',ATTESTATIONS_ENABLED:'true',ATTESTATIONS_APPROVED:'false',PRIVATE_COMMUNICATIONS_APPROVED:'false',LEARNING_ENABLED:'true',ASSETS_ENABLED:'true',PROTOTYPE_MODE:'true',NEXT_PUBLIC_DEMO_MODE:'full',NEXT_PUBLIC_SITE_PHASE:'prototype',MAIL_DRIVER:'file',SMTP_URL:'',MESSAGING_RESEND_API_KEY:'',CRON_SECRET:'',MAINTENANCE_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'};
const server=spawn(process.execPath,['scripts/e2e-server.ts'],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env});let log='';server.stdout?.on('data',v=>{log=(log+String(v)).slice(-12000)});server.stderr?.on('data',v=>{log=(log+String(v)).slice(-12000)});
const end=once(server,'exit');const stop=()=>{if(server.connected)server.send('shutdown')};process.on('SIGINT',stop);process.on('SIGTERM',stop);
let ready=false;for(let i=0;i<150;i++){if(server.exitCode!==null)break;try{const r=await fetch(base+'/api/v1/learning/config/',{signal:AbortSignal.timeout(1500)});if(r.ok&&(await r.json()).enabled){ready=true;break}}catch{}await pause(500)}
if(ready)console.log('Prototype local prêt : '+base+'/prototype/\nComptes : mentee-prototype@example.invalid, mentor-prototype@example.invalid, admin-prototype@example.invalid, moderation-prototype@example.invalid\nCompte avec attestation : diplome-prototype@example.invalid\nMot de passe de démonstration : '+prototypePassword+'\nBase locale persistante ; e-mails fictifs consultables dans le prototype.');else{console.error('Démarrage du prototype impossible.\n'+log);stop();process.exitCode=1}await end;
