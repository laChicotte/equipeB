import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {NotificationService} from '../src/modules/notifications/service.ts';
import {writeNotice} from '../src/modules/notifications/write.ts';
import {handleNotifications} from '../src/server/notifications-http.ts';
import {seedMessagingFixture} from './fixtures/messaging.ts';
import {MentoringService} from '../src/modules/mentoring/service.ts';
import {PlayService} from '../src/modules/play/service.ts';
test('notifications : confidentialité, curseur précis et lecture limitée aux éléments affichés',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);const f=await seedMessagingFixture(db),s=new NotificationService(db);
 const ids:string[]=[];
 for(let i=0;i<23;i++){const [r]=await db.query<{id:string}>(`INSERT INTO learning_notice(user_id,body,href,created_at) VALUES($1,$2,'/bibliotheque/',CASE WHEN $3 THEN '2026-11-08T12:00:00.123456Z'::timestamptz ELSE '2026-11-08T12:00:00.123455Z'::timestamptz END) RETURNING id`,[f.mentee.id,'Notification synthétique '+i,i<22]);ids.push(r.id)}
 const [foreign]=await db.query<{id:string}>("INSERT INTO learning_notice(user_id,body,href) VALUES($1,'CONTENU_AUTRE_COMPTE','/communaute/') RETURNING id",[f.other.id]);
 await t.test('vingt éléments par page, égalité d’horodatage et microsecondes conservées',async()=>{
  const first=await s.inbox(f.mentee,{});assert.equal(first.items.length,20);assert.equal(first.unread,23);assert.ok(first.next?.before.includes('123456'));
  const second=await s.inbox(f.mentee,first.next!);assert.equal(second.items.length,3);assert.equal(second.next,null);assert.equal(new Set([...first.items,...second.items].map(n=>n.id)).size,23);
  assert.equal(JSON.stringify(first).includes('CONTENU_AUTRE_COMPTE'),false);assert.equal(JSON.stringify(first).includes(f.other.id),false);
  await assert.rejects(s.inbox(f.mentee,{before:first.next!.before}));await assert.rejects(s.inbox(f.mentee,{userId:f.other.id}));
 });
 await t.test('aucune lecture intercompte, même pour un administrateur ; lot atomique',async()=>{
  await assert.rejects(s.read(f.admin,{ids:[ids[0]]}),{status:404});
  await assert.rejects(s.read(f.mentee,{ids:[ids[0],foreign.id]}),{status:404});assert.equal((await s.count(f.mentee)).unread,23);
  await assert.rejects(s.read(f.mentee,{ids:[]}));await assert.rejects(s.read(f.mentee,{ids:[ids[0],ids[0]]}));await assert.rejects(s.read(f.mentee,{ids:Array.from({length:21},()=>randomUUID())}));
 });
 await t.test('lecture idempotente ; une notification arrivée ensuite reste non lue',async()=>{
  const page=await s.inbox(f.mentee,{}),shown=page.items.map(n=>n.id);
  const [newNotice]=await db.query<{id:string}>("INSERT INTO learning_notice(user_id,body,href) VALUES($1,'Nouvelle notification pendant la lecture','/bibliotheque/') RETURNING id",[f.mentee.id]);
  await s.read(f.mentee,{ids:shown});const [before]=await db.query<{read_at:string}>('SELECT read_at FROM learning_notice WHERE id=$1',[shown[0]]);await s.read(f.mentee,{ids:shown});const [after]=await db.query<{read_at:string}>('SELECT read_at FROM learning_notice WHERE id=$1',[shown[0]]);assert.deepEqual(before,after);
  assert.equal((await s.count(f.mentee)).unread,4);assert.ok((await s.inbox(f.mentee,{filter:'unread'})).items.some(n=>n.id===newNotice.id));
 });
 await t.test('compte désactivé ou adresse non confirmée : droits relus',async()=>{
  await db.query('UPDATE app_user SET email_verified_at=NULL WHERE id=$1',[f.other.id]);await assert.rejects(s.count(f.other),{status:403});
  await db.query('UPDATE app_user SET email_verified_at=now(),disabled_at=now() WHERE id=$1',[f.other.id]);await assert.rejects(s.inbox(f.other,{}),{status:403});await assert.rejects(s.count(null),{status:401});
 });
 await t.test('HTTP : session, origine exacte, lecture seule du compteur et paramètres stricts',async()=>{
  const config=()=>({origin:'https://example.invalid',secure:true,secret:'x'.repeat(48),registrationEnabled:false}),deps={db:async()=>db,config,account:async()=>f.mentee};const url='https://example.invalid/api/v1/notifications/';
  assert.equal((await handleNotifications(new Request(url),'inbox',{...deps,account:async()=>null})).status,401);
  const response=await handleNotifications(new Request(url),'inbox',deps);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await handleNotifications(new Request(url+'count/?userId='+f.other.id),'count',deps)).status,400);
  assert.equal((await handleNotifications(new Request(url+'count/',{method:'POST'}),'count',deps)).status,405);
  assert.equal((await handleNotifications(new Request(url,{method:'POST',headers:{origin:'https://elsewhere.invalid','content-type':'application/json'},body:JSON.stringify({ids:[ids[0]]})}),'inbox',deps)).status,403);
  const read=await handleNotifications(new Request(url,{method:'POST',headers:{origin:config().origin,'content-type':'application/json'},body:JSON.stringify({ids:[ids[0]]})}),'inbox',deps);assert.equal(read.status,200);
 });
});
test('notifications de revue : transaction, absence d’auteur fictif et événements réels',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);const f=await seedMessagingFixture(db),s=new NotificationService(db),play=new PlayService(db);
 const [category]=await db.query<{id:string}>('SELECT id FROM game_category LIMIT 1');
 const question=await play.saveQuestion(f.mentor,{categoryId:category.id,level:'beginner',stem:'Combien font deux plus deux ?',options:['4','5','6'],correctIndex:0,explanation:'Deux groupes de deux unités donnent quatre unités.',source:''});await play.submitQuestion(f.mentor,question.id);
 await assert.rejects(play.reviewQuestion(f.mentor,{id:question.id,decision:'approved',note:'Auto-approbation interdite dans ce test.'}),{status:403});assert.equal((await s.count(f.mentor)).unread,0);
 await play.reviewQuestion(f.admin,{id:question.id,decision:'in_review',note:'Examen synthétique en cours pour ce test.'});await play.reviewQuestion(f.admin,{id:question.id,decision:'in_review',note:'Reprise du même état sans notification répétée.'});assert.equal((await s.count(f.mentor)).unread,1);
 await play.reviewQuestion(f.admin,{id:question.id,decision:'approved',note:'Correction synthétique vérifiée pour ce test.'});assert.equal((await s.count(f.mentor)).unread,2);
 await assert.rejects(play.reviewQuestion(f.admin,{id:question.id,decision:'approved',note:'Nouvelle approbation dans un état invalide.'}),{status:409});assert.equal((await s.count(f.mentor)).unread,2);
 const game=await play.createGame(f.mentor,{title:'Un quiz synthétique',description:'Un jeu uniquement destiné aux essais isolés des notifications.',categoryId:category.id,level:'beginner',durationMinutes:1,questionIds:[question.id]});await play.submitGame(f.mentor,game.id);await play.reviewGame(f.admin,game.id,true);assert.equal((await s.count(f.mentor)).unread,3);
 const mentor=new MentoringService(db);const [profile]=await db.query<{revision:number}>('SELECT revision FROM mentor_profile WHERE user_id=$1',[f.mentor.id]);await mentor.review(f.admin,{id:f.mentor.id,revision:profile.revision,decision:'suspend',note:'Suspension synthétique de la publication pour ce test.'});assert.equal((await s.count(f.mentor)).unread,4);
 const before=(await s.count(f.mentee)).unread;
 await assert.rejects(db.transaction(async sql=>{await writeNotice(sql,f.mentee.id,f.admin.id,'Cette notification doit être annulée.','/play/');throw Error('Rollback test')}));assert.equal((await s.count(f.mentee)).unread,before);
 await db.transaction(async sql=>{await writeNotice(sql,null,f.admin.id,'Aucun destinataire fictif.','/play/');await writeNotice(sql,f.admin.id,f.admin.id,'Pas d’auto-notification.','/play/')});assert.equal((await s.count(f.admin)).unread,0);
});
