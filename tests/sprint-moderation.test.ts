import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {SprintService} from '../src/modules/play/sprint.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {handleSprint} from '../src/server/sprint-http.ts';
import type {Account} from '../src/modules/identity/access.ts';
test('Sprint : file administrative paginée, corrections privées et retrait idempotent',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);
 async function actor(role:string){const [u]=await db.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at) VALUES(gen_random_uuid()||'@example.invalid','unused',$1,now()) RETURNING id`,[role]);return {id:u.id,role,email:'fixture@example.invalid',emailVerified:true,adultAccessApproved:false} as Account}
 const admin=await actor('admin'),user=await actor('mentee'),[category]=await db.query<{id:string}>('SELECT id FROM game_category LIMIT 1');let calls=0;
 const service=new SprintService(db,async()=>{calls++;return {safeForPublic:true,title:'Calculs synthétiques',description:'Un quiz synthétique uniquement pour les tests isolés.',questions:Array.from({length:5},(_,i)=>({stem:`Combien font ${i+1} plus un ?`,options:[String(i+2),String(i+3),String(i+4)],correctIndex:0,explanation:'Ajouter une unité donne le nombre entier qui suit.'}))}},'fixture/model');
 const game=await service.create(user,{requestKey:randomUUID(),categoryId:category.id,level:'beginner',topic:'Calculs',publishAccepted:true});
 await service.report(user,{gameId:game.id,reason:'incorrect'});
 // Additional queue-only fixtures, confined to the isolated embedded database.
 for(let i=0;i<20;i++){
  const [r]=await db.query<{id:string}>("INSERT INTO ai_sprint_generation(user_id,request_key,input_hash,model,status) VALUES($1,gen_random_uuid(),repeat('a',64),'fixture/model','published') RETURNING id",[user.id]);
  const [g]=await db.query<{id:string}>(`INSERT INTO quiz_game(author_id,title,description,category_id,level,duration_minutes,status,published_at,generation_id) VALUES($1,'File synthétique','Jeu de contrôle de la pagination uniquement.',$2,'beginner',3,'published',now(),$3) RETURNING id`,[user.id,category.id,r.id]);
  await service.report(user,{gameId:g.id,reason:i%2?'personal_data':'inappropriate'});
 }
 await t.test('compte et rôle relus, données de compte absentes de la réponse',async()=>{
  await assert.rejects(service.reports(null,{}),{status:401});await assert.rejects(service.reports(user,{}),{status:403});await assert.rejects(service.review(user,game.id),{status:403});
  await assert.rejects(service.archive(user,{gameId:game.id,confirm:true}),{status:403});
  const text=JSON.stringify(await service.reports(admin,{}));assert.equal(text.includes('email'),false);assert.equal(text.includes(user.id),false);
 });
 await t.test('vingt jeux par page, curseur sans doublon et motifs agrégés',async()=>{
  const first=await service.reports(admin,{});assert.equal(first.items.length,20);assert.ok(first.next);
  const second=await service.reports(admin,{after:first.next});assert.equal(second.items.length,1);assert.equal(second.next,null);
  const all=[...first.items,...second.items];assert.equal(new Set(all.map(x=>x.id)).size,21);
  assert.equal(all.reduce((n,x)=>n+x.reports,0),21);assert.equal(all.reduce((n,x)=>n+x.incorrect,0),1);
  await assert.rejects(service.reports(admin,{after:'invalid'}));await assert.rejects(service.reports(admin,{status:'invalid'}));
 });
 await t.test('examen complet des corrections, sans métadonnées du demandeur',async()=>{
  const detail=await service.review(admin,game.id);assert.equal(detail.questions.length,5);assert.equal(detail.questions[0].correct_index,0);
  assert.equal('author_id' in detail,false);assert.equal('user_id' in detail,false);
  await assert.rejects(service.review(admin,randomUUID()),{status:404});
 });
 await t.test('retrait concurrent : un seul audit, nouvelles parties refusées et partie existante préservée',async()=>{
  const play=new PlayService(db),owner=randomBytes(32).toString('hex'),attempt=await play.start(owner,null,{gameId:game.id,saveHistory:false});
  await assert.rejects(service.archive(admin,{gameId:game.id,confirm:false}));
  await Promise.all([service.archive(admin,{gameId:game.id,confirm:true}),service.archive(admin,{gameId:game.id,confirm:true})]);
  assert.equal((await db.query("SELECT id FROM audit_event WHERE action='play.sprint.archived'")).length,1);
  await assert.rejects(play.start(owner,null,{gameId:game.id,saveHistory:false}),{status:404});
  assert.ok((await play.state(owner,null,attempt.id)).question);
  assert.equal((await service.reports(admin,{status:'archived'})).items.length,1);
  assert.equal((await service.reports(admin,{})).items.length,20);
 });
 await t.test('HTTP : modération disponible IA fermée, session, origine et méthode protégées',async()=>{
  const env={APP_URL:'https://example.invalid',PLAY_ENABLED:'true',AI_SPRINT_ENABLED:'false'};
  const deps={env,db:async()=>db,account:async()=>admin,generate:async()=>{throw new Error('Unexpected AI call')}};
  const url='https://example.invalid/api/v1/play/sprint';
  const list=await handleSprint(new Request(url+'?action=reports'),deps);assert.equal(list.status,200);assert.equal(list.headers.get('cache-control'),'no-store');
  const missing=await handleSprint(new Request(url+'?action=reports'),{...deps,account:async()=>null});assert.equal(missing.status,401);
  assert.equal((await handleSprint(new Request(url+'?action=review&id='+game.id),{...deps,account:async()=>user})).status,403);
  assert.equal((await handleSprint(new Request(url+'?action=unknown'),deps)).status,404);
  assert.equal((await handleSprint(new Request(url+'?action=archive',{method:'POST',headers:{origin:'https://elsewhere.invalid'},body:JSON.stringify({gameId:game.id,confirm:true})}),deps)).status,403);
  assert.equal((await handleSprint(new Request(url+'?action=archive',{method:'POST',headers:{origin:env.APP_URL,'content-type':'application/json'},body:JSON.stringify({gameId:game.id,confirm:true})}),deps)).status,200);
  assert.equal(calls,1);
 });
 await t.test('rôle révoqué ou compte désactivé refusé malgré une ancienne session administrateur',async()=>{
  await db.query("UPDATE app_user SET role='mentee' WHERE id=$1",[admin.id]);await assert.rejects(service.reports(admin,{}),{status:403});
  await db.query("UPDATE app_user SET role='admin',disabled_at=now() WHERE id=$1",[admin.id]);await assert.rejects(service.review(admin,game.id),{status:403});
 });
});
