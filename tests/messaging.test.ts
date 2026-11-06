import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {MessagingService} from '../src/modules/messaging/service.ts';
import {sendSchema,pageSchema} from '../src/modules/messaging/schemas.ts';
import {messagingFlags,handleMessaging} from '../src/server/messaging-http.ts';
import {seedMessagingFixture} from './fixtures/messaging.ts';
test('messagerie : schémas stricts et activation de production approuvée',()=>{
 const input={programId:randomUUID(),clientId:randomUUID(),body:'Bonjour.'};
 for(const extra of [{senderId:randomUUID()},{body:' '},{body:'a'.repeat(2001)},{clientId:'invalid'},{conversationId:randomUUID()}])assert.equal(sendSchema.safeParse({...input,...extra}).success,false);
 assert.equal(pageSchema.safeParse({programId:input.programId,before:'-1'}).success,false);
 assert.equal(messagingFlags({NODE_ENV:'production',MESSAGING_ENABLED:'true',MENTORING_ENABLED:'true'}).enabled,false);
 assert.deepEqual(messagingFlags({NODE_ENV:'production',MESSAGING_ENABLED:'true',MENTORING_ENABLED:'true',PRIVATE_COMMUNICATIONS_APPROVED:'true'}),{enabled:true,sendEnabled:true});
});
test('messagerie : autorisations, blocage, signalements et états',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);const f=await seedMessagingFixture(db);
 const service=new MessagingService(db,true,true),closed=new MessagingService(db,false,false),noSend=new MessagingService(db,true,false);
 const send=(body='Bonjour, commençons notre échange.',clientId=randomUUID(),account=f.mentor)=>service.send(account,{programId:f.programId,body,clientId});
 let first={id:'',seq:''};
 await t.test('fermeture, appartenance et aucune lecture administrative globale',async()=>{
  await assert.rejects(closed.conversations(f.mentee),{code:'messaging_closed'});await assert.rejects(noSend.send(f.mentor,{programId:f.programId,clientId:randomUUID(),body:'Bonjour.'}),{status:403});
  await assert.rejects(service.messages(f.other,{programId:f.programId}),{status:404});await assert.rejects(service.messages(f.admin,{programId:f.programId}),{status:404});
  await assert.rejects(service.send(null,{programId:f.programId,clientId:randomUUID(),body:'Bonjour.'}),{status:401});
  await assert.rejects(service.send(f.mentor,{programId:randomUUID(),clientId:randomUUID(),body:'Bonjour.'}),{status:404});
 });
 await t.test('envoi idempotent simultané et notification privée',async()=>{
  const clientId=randomUUID();const results=await Promise.all([send(undefined,clientId),send(undefined,clientId)]);assert.equal(results[0].id,results[1].id);first=results[0];
  assert.equal((await db.query('SELECT id FROM private_message')).length,1);
  await assert.rejects(send('Un contenu modifié.',clientId),{status:409});
  const inbox=await service.conversations(f.mentee) as {unread:number}[];assert.equal(inbox[0].unread,1);assert.equal((await service.conversations(f.other)).length,0);
  const thread=await service.messages(f.mentee,{programId:f.programId});assert.equal(thread.items[0].body,'Bonjour, commençons notre échange.');assert.equal(thread.canSend,true);
 });
 await t.test('lecture monotone et messages nouveaux non acquittés à tort',async()=>{
  await service.read(f.mentee,{programId:f.programId,messageId:first.id});assert.equal((await service.conversations(f.mentee) as {unread:number}[])[0].unread,0);
  const later=await send('Un deuxième message de test.');await service.read(f.mentee,{programId:f.programId,messageId:first.id});assert.equal((await service.conversations(f.mentee) as {unread:number}[])[0].unread,1);
  await service.read(f.mentee,{programId:f.programId,messageId:later.id});await assert.rejects(service.read(f.other,{programId:f.programId,messageId:first.id}),{status:404});
 });
 await t.test('blocage dans les deux sens et retrait de son propre blocage uniquement',async()=>{
  await service.block(f.mentee,{programId:f.programId,blocked:true});await assert.rejects(send(),{code:'blocked'});await assert.rejects(send('Réponse bloquée.',randomUUID(),f.mentee),{code:'blocked'});
  await service.block(f.mentor,{programId:f.programId,blocked:false});assert.equal((await service.messages(f.mentor,{programId:f.programId})).blocked,true);
  await service.block(f.mentor,{programId:f.programId,blocked:true});await service.block(f.mentee,{programId:f.programId,blocked:false});await assert.rejects(send(),{code:'blocked'});
  await closed.block(f.mentor,{programId:f.programId,blocked:false});await send('Le blocage est maintenant retiré.');
 });
 await t.test('signalement ciblé sans accès à la conversation pour les modérateurs',async()=>{
  await closed.report(f.mentee,{programId:f.programId,messageId:first.id,reason:'other',details:'Vérification synthétique du parcours de signalement.'});
  await closed.report(f.mentee,{programId:f.programId,messageId:first.id,reason:'spam',details:'Un deuxième signalement de test doit rester unique.'});
  assert.equal((await db.query('SELECT id FROM message_report')).length,1);
  await assert.rejects(service.report(f.mentor,{programId:f.programId,messageId:first.id,reason:'other',details:'Signaler mon propre message est interdit.'}),{status:403});
  await assert.rejects(service.report(f.other,{programId:f.programId,messageId:first.id,reason:'other',details:'Un tiers ne peut pas signaler ce message privé.'}),{status:404});
  await assert.rejects(service.reports({...f.other,role:'moderator'}),{status:403});
  const queue=await service.reports(f.moderator) as {id:string;evidence:string}[];assert.equal(queue.length,1);assert.equal(queue[0].evidence,'Bonjour, commençons notre échange.');
  assert.ok(!JSON.stringify(queue).includes('deuxième message'));await assert.rejects(service.messages(f.moderator,{programId:f.programId}),{status:404});
  await db.query("UPDATE app_user SET role='moderator' WHERE id=$1",[f.mentor.id]);await assert.rejects(service.moderate(f.mentor,{id:queue[0].id,action:'hide',note:'Interdiction de traiter son propre message.'}),{status:403});await db.query("UPDATE app_user SET role='mentor' WHERE id=$1",[f.mentor.id]);
  await service.moderate(f.moderator,{id:queue[0].id,action:'hide',note:'Masquage synthétique pour vérifier la confidentialité.'});
  const thread=await service.messages(f.mentee,{programId:f.programId});assert.equal(thread.items[0].hidden,true);assert.equal(thread.items[0].body,'');
  await assert.rejects(service.moderate(f.admin,{id:queue[0].id,action:'dismiss',note:'Le signalement ne peut être traité deux fois.'}),{status:409});
 });
 await t.test('programme suspendu, mentor retiré, accès adulte révoqué',async()=>{
  await db.query("UPDATE mentoring_program SET status='suspended' WHERE id=$1",[f.programId]);await assert.rejects(send(),{code:'program_inactive'});assert.equal((await service.messages(f.mentee,{programId:f.programId})).canSend,false);
  await db.query("UPDATE mentoring_program SET status='active' WHERE id=$1",[f.programId]);await db.query("UPDATE mentor_profile SET publication_status='suspended',verification_status='pending',verified_at=NULL,verified_by=NULL WHERE user_id=$1",[f.mentor.id]);await assert.rejects(send(),{status:403});
  await db.query("UPDATE mentor_profile SET publication_status='published',verification_status='verified',verified_at=now(),verified_by=$2 WHERE user_id=$1",[f.mentor.id,f.admin.id]);
  await db.query('UPDATE app_user SET adult_access_approved_at=NULL WHERE id=$1',[f.mentee.id]);await assert.rejects(send(),{status:403});await assert.rejects(service.messages(f.mentee,{programId:f.programId}),{status:403});
  await db.query('UPDATE app_user SET adult_access_approved_at=now() WHERE id=$1',[f.mentee.id]);
 });
 await t.test('pagination sans saut et contenu texte non transformé en HTML',async()=>{
  for(let i=0;i<42;i++)await send('Message synthétique de pagination '+i);
  const last=await service.messages(f.mentee,{programId:f.programId});assert.equal(last.items.length,40);assert.equal(last.hasMore,true);
  const older=await service.messages(f.mentee,{programId:f.programId,before:String(last.items[0].seq)});assert.equal(new Set([...older.items,...last.items].map(m=>m.id)).size,45);
  const body='<script>alert("test")</script>';await send(body);assert.equal((await service.messages(f.mentee,{programId:f.programId})).items.at(-1)!.body,body);
 });
 await t.test('HTTP : session, Origin exact, taille et identité serveur',async()=>{
  const config={origin:'http://127.0.0.1:3000',secure:false,registrationEnabled:false,secret:'synthetic-messaging-secret-not-for-production'};
  const deps={db:async()=>db,config:()=>config,flags:()=>({enabled:true,sendEnabled:true}),account:async()=>f.mentee};
  const post=(action:string,data:unknown,origin=config.origin)=>handleMessaging(new Request(config.origin,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)}),action,deps);
  assert.equal((await post('send',{},'https://other.invalid')).status,403);assert.equal((await post('send',{programId:f.programId,clientId:randomUUID(),body:'Bonjour.',senderId:f.mentor.id})).status,400);
  assert.equal((await post('send',{large:'a'.repeat(9000)})).status,413);
  assert.equal((await handleMessaging(new Request(config.origin),'conversations',{...deps,account:async()=>null})).status,401);
  assert.equal((await post('send',{programId:f.programId,clientId:randomUUID(),body:'Message HTTP de test.'})).status,201);
  const response=await handleMessaging(new Request(config.origin+'?programId='+f.programId),'messages',deps);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await handleMessaging(new Request(config.origin),'send',deps)).status,405);
 });
});
