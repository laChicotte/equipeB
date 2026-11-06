import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4389';
try{await fetch(base,{signal:AbortSignal.timeout(500)});throw new Error('Test port is already in use')}catch(error){if(error instanceof Error&&error.message==='Test port is already in use')throw error}
const server=spawn(process.execPath,['scripts/e2e-server.ts','--production'],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc'],env:{...process.env,
  NODE_ENV:'production',TEST_SERVER_PORT:'4389',AUTH_ENABLED:'false',AUTH_REGISTRATION_ENABLED:'false',REAL_ACCOUNTS_APPROVED:'false',PLAY_ENABLED:'false',
  DATABASE_URL:'',AUTH_SECRET:'',SMTP_URL:'',MAIL_FROM:'',MAIL_DRIVER:'',APP_URL:'',DB_DRIVER:'postgres',NEXT_TELEMETRY_DISABLED:'1'}});
server.stdout?.on('data',()=>{});server.stderr?.on('data',()=>{});
try{
 let ready=false;const deadline=Date.now()+45_000;
 while(Date.now()<deadline){if(server.exitCode!==null)throw new Error('Preview server exited');try{const response=await fetch(`${base}/api/health/`,{signal:AbortSignal.timeout(2000)});if(response.ok){assert.deepEqual(await response.json(),{status:'ok'});ready=true;break}}catch{}await pause(250)}
 assert.ok(ready);
 assert.equal((await fetch(`${base}/`)).status,200);
 assert.equal((await fetch(`${base}/auth/connexion/`)).status,200);
 const play=await fetch(`${base}/api/v1/play/config/`);assert.deepEqual(await play.json(),{enabled:false});
 const config=await fetch(`${base}/api/v1/auth/config/`);assert.deepEqual(await config.json(),{enabled:false,registrationEnabled:false});
 assert.equal((await fetch(`${base}/api/v1/auth/session/`)).status,503);
 const registration=await fetch(`${base}/api/v1/auth/register/`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
 assert.equal(registration.status,503);assert.equal(registration.headers.get('set-cookie'),null);
 console.log('Préversion de production : accueil, santé et comptes fermés vérifiés sans identifiants de base ni SMTP.');
}catch{console.error('Échec du contrôle de préversion de production. Aucune configuration privée affichée.');process.exitCode=1}
finally{
 if(server.exitCode===null){const ended=once(server,'exit').then(()=>true);if(server.connected)server.send('shutdown');else server.kill();if(!await Promise.race([ended,pause(10_000).then(()=>false)])){server.kill();process.exitCode=1}}
}
