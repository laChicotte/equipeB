import {REGISTRATION_RULES_VERSION} from '../src/content/registration.ts';
import {existsSync} from 'node:fs';
import {randomBytes,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {IdentityService} from '../src/modules/identity/service.ts';
import type {Mail} from '../src/server/mail.ts';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const email=`smoke-${randomUUID()}@example.invalid`;
const password='TalentLink-synthetic-test-2026';
const mails:Mail[]=[];
const token=()=>mails.at(-1)!.text.match(/#token=([a-f0-9]{64})/)![1];
try{
 if(process.env.NODE_ENV==='production'||process.env.DB_DRIVER==='pglite'||!process.env.DATABASE_URL)throw new Error('A development PostgreSQL URL is required');
 const db=await getDatabase();
 try{
  assert.deepEqual(await migrate(db),[]);
  const service=new IdentityService(db,{async send(mail){mails.push(mail)}},'http://127.0.0.1:3000',randomBytes(32).toString('hex'));
  await service.register({email,password,role:'mentee',adultConfirmed:true,registrationRulesAccepted:true,registrationRulesVersion:REGISTRATION_RULES_VERSION,termsAccepted:true,privacyAccepted:true});
  await assert.rejects(service.login({email,password}),{status:403});
  await service.consume({token:token()},'verify');
  const session=await service.login({email,password});
  assert.equal((await service.account(session))?.email,email);
  await service.requestEmail({email},'reset');const resetToken=token();
  const results=await Promise.allSettled([service.consume({token:resetToken,password:'TalentLink-updated-test-2026'},'reset'),service.consume({token:resetToken,password:'TalentLink-updated-test-2026'},'reset')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  const rejected=results.find(result=>result.status==='rejected');
  assert.equal(rejected?.status==='rejected'?rejected.reason?.status:undefined,400);
  assert.equal(await service.account(session),null);
  const renewed=await service.login({email,password:'TalentLink-updated-test-2026'});
  await service.logout(renewed);assert.equal(await service.account(renewed),null);
  console.log('PostgreSQL : inscription, vérification, sessions, reset concurrent et déconnexion vérifiés. Aucun e-mail réel envoyé.');
 }finally{
  try{await db.transaction(async sql=>{
   const [row]=await sql.query<{id:string}>('SELECT id FROM app_user WHERE email=$1',[email]);
   if(row){await sql.query('DELETE FROM audit_event WHERE actor_id=$1',[row.id]);await sql.query('DELETE FROM app_user WHERE id=$1 AND email=$2',[row.id,email]);}
  })}finally{await db.close()}
 }
}catch{
 console.error('Le contrôle PostgreSQL a échoué. Aucun détail de connexion n’est affiché.');process.exitCode=1;
}
