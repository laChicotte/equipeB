import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
import type {Database} from '../src/server/database.ts';
import {MessagingService} from '../src/modules/messaging/service.ts';
import {seedMessagingFixture} from '../tests/fixtures/messaging.ts';
process.loadEnvFile('.env.local');
if(process.env.NODE_ENV==='production'||process.env.DB_DRIVER==='pglite')throw new Error('Development PostgreSQL required');
const db=await getDatabase(),rollback=new Error('Synthetic transaction rollback');let verified=false;
try{
 try{await db.transaction(async sql=>{
  const isolated:Database={...sql,transaction:fn=>fn(sql),close:async()=>{}};const f=await seedMessagingFixture(isolated);const service=new MessagingService(isolated,true,true);
  const input={programId:f.programId,clientId:randomUUID(),body:'Message synthétique transactionnel, jamais visible aux autres connexions.'};
  const sent=await service.send(f.mentor,input);assert.equal((await service.send(f.mentor,input)).id,sent.id);
  assert.equal((await service.conversations(f.mentee) as {unread:number}[])[0].unread,1);
  await service.read(f.mentee,{programId:f.programId,messageId:sent.id});assert.equal((await service.conversations(f.mentee) as {unread:number}[])[0].unread,0);
  await service.block(f.mentee,{programId:f.programId,blocked:true});await assert.rejects(service.send(f.mentor,{...input,clientId:randomUUID()}),{code:'blocked'});
  await service.report(f.mentee,{programId:f.programId,messageId:sent.id,reason:'other',details:'Signalement synthétique sans contact avec une personne réelle.'});
  const [report]=await service.reports(f.moderator) as {id:string}[];await service.moderate(f.moderator,{id:report.id,action:'hide',note:'Masquage synthétique dans une transaction annulée.'});
  const history=await service.messages(f.mentee,{programId:f.programId});assert.equal(history.items[0].body,'');assert.equal(history.items[0].hidden,true);
  verified=true;throw rollback;
 })}catch(e){if(e!==rollback)throw e}
 if(!verified)throw new Error('Not verified');
 console.log('PostgreSQL natif : message, rejeu, lecture, blocage et signalement vérifiés. Transaction annulée ; aucune communication réelle ni donnée synthétique conservée.');
}catch{console.error('Vérification messagerie PostgreSQL échouée. Transaction annulée, aucun identifiant affiché.');process.exitCode=1}
finally{await db.close()}
