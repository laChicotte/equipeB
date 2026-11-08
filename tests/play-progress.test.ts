import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedPlayFixture} from './fixtures/play.ts';
import {seedMessagingFixture} from './fixtures/messaging.ts';
import {partyBadges,progressBadges} from '../src/modules/play/achievements.ts';
import {PlayProgressService} from '../src/modules/play/progress.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {handlePlay} from '../src/server/play-http.ts';
import type {Account} from '../src/modules/identity/access.ts';
test('badges : fin complète requise, seuil exact et aucun badge de vitesse',()=>{
 assert.deepEqual(partyBadges({completed:false,answered:3,total:3,correct:3}),[]);
 assert.deepEqual(partyBadges({completed:true,answered:0,total:0,correct:0}),[]);
 assert.deepEqual(partyBadges({completed:true,answered:4,total:5,correct:4}),[]);
 assert.deepEqual(partyBadges({completed:true,answered:5,total:5,correct:4}).map(x=>x.id),['quiz-complete','eighty-percent']);
 assert.equal(partyBadges({completed:true,answered:3,total:3,correct:2}).length,1);
 assert.equal(partyBadges({completed:true,answered:3,total:3,correct:3}).length,3);
 const badges=progressBadges({fullyAnswered:9,distinctGames:1,distinctCategories:1,successfulGames:1});
 assert.equal(badges.find(x=>x.id==='five-rounds')?.achieved,true);assert.equal(badges.find(x=>x.id==='three-games')?.achieved,false);assert.equal(badges.find(x=>x.id==='five-rounds')?.current,5);
});
test('Play : badges de partie et bilan personnel fondés sur les données réelles isolées',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);
 const game=await seedPlayFixture(db),f=await seedMessagingFixture(db),play=new PlayService(db),progress=new PlayProgressService(db);
 const owner=randomBytes(32).toString('hex');
 async function finish(account:Account|null,gameId=game.gameId,saveHistory=false,choices=[0,1,2]){
  const a=await play.start(owner,account,{gameId,saveHistory});
  for(const [index,choice] of choices.entries())await play.answer(owner,account,{attemptId:a.id,index,choice});
  return {id:a.id,state:await play.state(owner,account,a.id)};
 }
 await t.test('visiteur : badges seulement après la fin et aucune correction anticipée',async()=>{
  const a=await play.start(owner,null,{gameId:game.gameId,saveHistory:false}),before=await play.state(owner,null,a.id);
  assert.equal('badges' in before,false);assert.equal(JSON.stringify(before).includes('correctIndex'),false);
  for(const [index,choice] of [0,1,2].entries())await play.answer(owner,null,{attemptId:a.id,index,choice});
  const done=await play.state(owner,null,a.id);assert.equal((done.badges as unknown[]).length,3);
  await assert.rejects(play.state(randomBytes(32).toString('hex'),null,a.id),{status:404});
 });
 await t.test('parties sans accord et parties inachevées exclues des badges de parcours',async()=>{
  await finish(f.mentee);const started=await play.start(owner,f.mentee,{gameId:game.gameId,saveHistory:true});
  const p=await progress.progress(f.mentee);assert.equal(p.summary.started,1);assert.equal(p.summary.completed,0);assert.ok(p.badges.every(b=>!b.achieved));
  assert.equal((await play.state(owner,f.mentee,started.id)).completed,false);
 });
 await t.test('rejeu des réponses idempotent et répétition d’un quiz sans nouveau domaine',async()=>{
  const first=await finish(f.mentee,game.gameId,true);
  await play.answer(owner,f.mentee,{attemptId:first.id,index:2,choice:2});
  await finish(f.mentee,game.gameId,true);await finish(f.mentee,game.gameId,true);
  const p=await progress.progress(f.mentee);assert.equal(p.summary.completed,3);assert.equal(p.summary.fullyAnswered,3);assert.equal(p.summary.distinctGames,1);assert.equal(p.summary.distinctCategories,1);assert.equal(p.summary.successfulGames,1);assert.equal(p.summary.averagePercentage,100);
  assert.equal(p.badges.find(b=>b.id==='first-saved')?.achieved,true);assert.equal(p.badges.find(b=>b.id==='three-games')?.achieved,false);
 });
 await t.test('diversité réelle et trois jeux réussis, compteurs indépendants du dernier écran d’historique',async()=>{
  const [reviewer]=await db.query<{id:string}>("SELECT id FROM app_user WHERE role='admin' AND id<>$1 LIMIT 1",[f.admin.id]);
  const otherAdmin={id:reviewer.id,role:'admin',email:'fixture@example.invalid',emailVerified:true,adultAccessApproved:false} as Account;
  for(const name of ['Domaine synthétique A','Domaine synthétique B']){
   await play.category(f.admin,{name,expertise:name,active:true});const [c]=await db.query<{id:string}>('SELECT id FROM game_category WHERE name=$1',[name]);
   const q=await play.saveQuestion(f.admin,{categoryId:c.id,level:'beginner',stem:'Combien font deux plus deux ?',options:['4','5','6'],correctIndex:0,explanation:'Deux groupes de deux unités donnent quatre unités.',source:''});
   await play.submitQuestion(f.admin,q.id);await play.reviewQuestion(otherAdmin,{id:q.id,decision:'approved',note:'Correction synthétique contrôlée uniquement pour les tests.'});
   const g=await play.createGame(f.admin,{title:name,description:'Un jeu synthétique réservé aux tests de progression.',categoryId:c.id,level:'beginner',durationMinutes:1,questionIds:[q.id]});await play.submitGame(f.admin,g.id);await play.reviewGame(otherAdmin,g.id,true);
   await finish(f.mentee,g.id,true,[0]);
  }
  const p=await progress.progress(f.mentee);assert.equal(p.summary.fullyAnswered,5);assert.equal(p.summary.distinctGames,3);assert.equal(p.summary.distinctCategories,3);assert.equal(p.summary.successfulGames,3);assert.ok(p.badges.every(b=>b.achieved));assert.equal(p.categories.length,3);
 });
 await t.test('Sprint expiré partiellement répondu : score conservé, aucun badge complet ajouté',async()=>{
  const a=await play.start(owner,f.mentee,{gameId:game.gameId,saveHistory:true});await play.answer(owner,f.mentee,{attemptId:a.id,index:0,choice:0});
  await db.query("UPDATE game_attempt SET snapshot=jsonb_set(snapshot,'{aiGenerated}','true'),started_at=now()-interval '4 minutes' WHERE id=$1",[a.id]);
  const state=await play.state(owner,f.mentee,a.id);assert.equal(state.completed,true);assert.deepEqual(state.badges,[]);
  const p=await progress.progress(f.mentee);assert.equal(p.summary.completed,6);assert.equal(p.summary.fullyAnswered,5);assert.equal(p.summary.successfulGames,3);
 });
 await t.test('bilan strictement personnel, accès adulte et compte relus, aucune donnée de réponses',async()=>{
  assert.equal((await progress.progress(f.other)).summary.started,0);await assert.rejects(progress.progress(null),{status:401});
  await db.query('UPDATE app_user SET adult_access_approved_at=NULL WHERE id=$1',[f.other.id]);await assert.rejects(progress.progress(f.other),{status:403});
  const keySet=new Set<string>();function inspect(value:unknown){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){keySet.add(key);inspect(child)}}inspect(await progress.progress(f.mentee));for(const field of ['correct_index','explanation','owner_hash','email','snapshot','questions'])assert.equal(keySet.has(field),false);
  await db.query('UPDATE app_user SET disabled_at=now() WHERE id=$1',[f.other.id]);await assert.rejects(progress.progress(f.other),{status:403});
 });
 await t.test('HTTP : session, lecture seule et identifiant d’un autre compte refusé',async()=>{
  const config=()=>({enabled:true,origin:'https://example.invalid',secure:true,secret:'x'.repeat(48)}),deps={config,db:async()=>db,account:async()=>f.mentee};
  const url='https://example.invalid/api/v1/play/progress';
  assert.equal((await handlePlay(new Request(url),'progress',{...deps,account:async()=>null})).status,401);
  const response=await handlePlay(new Request(url),'progress',deps);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).summary.fullyAnswered,5);
  assert.equal((await handlePlay(new Request(url+'?userId='+f.other.id),'progress',deps)).status,400);
  assert.equal((await handlePlay(new Request(url,{method:'POST',body:'{}'}),'progress',deps)).status,405);
 });
});
