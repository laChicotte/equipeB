import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import type {Account} from '../src/modules/identity/access.ts';
import {SprintService,sprintInput,validateSprint} from '../src/modules/play/sprint.ts';
import type {SprintOutput} from '../src/modules/play/sprint.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {handleSprint} from '../src/server/sprint-http.ts';
const output=():SprintOutput=>({safeForPublic:true,title:'Sprint — les premiers calculs',description:'Cinq questions synthétiques pour les essais automatisés en base isolée.',questions:Array.from({length:5},(_,i)=>({stem:`Combien font ${i+1} plus ${i+1} ?`,options:[String((i+1)*2),String((i+1)*2+1),String((i+1)*2+2)],correctIndex:0,explanation:`Deux groupes de ${i+1} unités donnent ${(i+1)*2} unités au total.`}))});
test('Sprint : schémas stricts, publication consentie et données personnelles refusées',()=>{
 const input={requestKey:randomUUID(),categoryId:randomUUID(),level:'beginner',topic:'Calcul élémentaire',publishAccepted:true};
 assert.equal(sprintInput.safeParse(input).success,true);
 for(const extra of [{publishAccepted:false},{topic:'Contact test@example.invalid'},{topic:'Téléphone +224 625 59 51 69'},{admin:true}])assert.equal(sprintInput.safeParse({...input,...extra}).success,false);
 for(const raw of [{...output(),safeForPublic:false},{...output(),title:'Écrire à test@example.invalid'},{...output(),questions:Array(5).fill(output().questions[0])},{...output(),questions:output().questions.slice(0,4)}])assert.throws(()=>validateSprint(raw));
 assert.equal(validateSprint(output()).questions.length,5);
});
test('Sprint : génération, catalogue public, chronomètre, signalement et quotas',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);
 async function actor(verified=true){const [u]=await db.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at) VALUES(gen_random_uuid()||'@example.invalid','unused','mentee',CASE WHEN $1 THEN now() ELSE NULL END) RETURNING id`,[verified]);return {id:u.id,role:'mentee',email:'fixture@example.invalid',emailVerified:verified,adultAccessApproved:false} as Account}
 const user=await actor(),other=await actor(),unverified=await actor(false),[category]=await db.query<{id:string}>('SELECT id FROM game_category WHERE active LIMIT 1');
 const input=()=>({requestKey:randomUUID(),categoryId:category.id,level:'beginner',topic:'Calcul élémentaire',publishAccepted:true});
 let calls=0;const service=new SprintService(db,async()=>{calls++;return output()},'fixture/model'),play=new PlayService(db);let gameId='';
 await t.test('compte confirmé relu avant tout appel IA, sans approbation adulte fictive',async()=>{
  await assert.rejects(service.create(null,input()),{status:401});await assert.rejects(service.create(unverified,input()),{status:403});assert.equal(calls,0);
 });
 await t.test('publication automatique traçable sans inventer de revue humaine, et rejeu idempotent',async()=>{
  const v=input(),a=await service.create(user,v);gameId=a.id!;assert.equal(calls,1);assert.equal((await service.create(user,v)).id,gameId);assert.equal(calls,1);
  await assert.rejects(service.create(user,{...v,topic:'Un autre thème'}),{status:409});
  const catalog=await play.catalog({});assert.equal(catalog.total,1);const item=catalog.items[0];assert.equal(item.ai_generated,true);assert.equal('author_id' in item,false);assert.equal('questions' in item,false);
  const [g]=await db.query<{reviewed_by:null;status:string}>('SELECT reviewed_by,status FROM quiz_game WHERE id=$1',[gameId]);assert.equal(g.reviewed_by,null);assert.equal(g.status,'published');
  await assert.rejects(db.query("UPDATE quiz_question_version SET status='approved' WHERE generation_id IS NOT NULL"));
 });
 await t.test('questions jouables sans réponse anticipée ; fin du Sprint appliquée côté serveur',async()=>{
  const owner=randomBytes(32).toString('hex'),a=await play.start(owner,null,{gameId,saveHistory:false});
  const s=await play.state(owner,null,a.id);assert.equal(s.aiGenerated,true);assert.equal(JSON.stringify(s).includes('correctIndex'),false);assert.equal(JSON.stringify(s).includes('explanation'),false);assert.ok(s.deadline);
  assert.equal((await play.answer(owner,null,{attemptId:a.id,index:0,choice:0})).correct,true);
  await db.query("UPDATE game_attempt SET started_at=now()-interval '4 minutes' WHERE id=$1",[a.id]);
  await assert.rejects(play.answer(owner,null,{attemptId:a.id,index:1,choice:0}),{status:410});
  const ended=await play.state(owner,null,a.id);assert.equal(ended.completed,true);assert.equal(ended.question,null);assert.equal(ended.score,10);assert.equal(ended.unanswered,4);assert.equal(ended.durationSeconds,180);
 });
 await t.test('signalement distinct et retrait administratif du catalogue',async()=>{
  await service.report(other,{gameId,reason:'incorrect'});await service.report(other,{gameId,reason:'incorrect'});
  assert.equal((await db.query('SELECT * FROM ai_sprint_report')).length,1);
  await db.query("UPDATE app_user SET role='admin' WHERE id=$1",[other.id]);
  const games=await play.games(other);assert.equal(games[0].reports,1);await play.reviewGame(other,gameId,false);assert.equal((await play.catalog({})).total,0);
 });
 await t.test('échec IA conservé dans les quotas, sans jeu partiellement publié',async()=>{
  const fail=new SprintService(db,async()=>({...output(),safeForPublic:false}),'fixture/model');
  await assert.rejects(fail.create(user,input()),{status:422});
  assert.equal((await db.query("SELECT * FROM ai_sprint_generation WHERE status='failed'")).length,1);
  await service.create(user,input());await assert.rejects(service.create(user,input()),{status:429});assert.equal(calls,2);
 });
 await t.test('compte désactivé pendant la génération : aucune publication',async()=>{
  const disabled=await actor();const s=new SprintService(db,async()=>{await db.query('UPDATE app_user SET disabled_at=now() WHERE id=$1',[disabled.id]);return output()},'fixture/model');
  await assert.rejects(s.create(disabled,input()),{status:403});
  assert.equal((await db.query('SELECT id FROM quiz_game WHERE author_id=$1',[disabled.id])).length,0);
 });
 await t.test('demande en cours : une reprise concurrente ne déclenche pas un second appel IA',async()=>{
  const fresh=await actor(),v=input();let release!:(q:SprintOutput)=>void,entered!:()=>void,n=0;
  const started=new Promise<void>(resolve=>{entered=resolve});
  const s=new SprintService(db,async()=>{n++;entered();return new Promise<SprintOutput>(resolve=>{release=resolve})},'fixture/model');
  const pending=s.create(fresh,v);await started;
  await assert.rejects(s.create(fresh,v),{status:409});release(output());await pending;assert.equal(n,1);
 });
 await t.test('plafond global sérialisé, sans dépassement par deux demandes concurrentes',async()=>{
  await db.query(`INSERT INTO ai_sprint_generation(user_id,request_key,input_hash,model,status) SELECT $1,gen_random_uuid(),repeat('a',64),'fixture/model','failed' FROM generate_series(1,29-(SELECT count(*)::integer FROM ai_sprint_generation))`,[other.id]);
  const first=await actor(),second=await actor();
  const results=await Promise.allSettled([service.create(first,input()),service.create(second,input())]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===429).length,1);
  assert.equal((await db.query<{count:number}>('SELECT count(*)::integer FROM ai_sprint_generation'))[0].count,30);
 });
 await t.test('HTTP : fermeture sans DB, origine et session, aucun secret dans la configuration',async()=>{
  const env={APP_URL:'https://example.invalid',PLAY_ENABLED:'true',AI_SPRINT_ENABLED:'true',AI_GATEWAY_MODEL:'fixture/model'};
  const deps={env,db:async()=>db,account:async()=>null,generate:async()=>output()};
  const response=await handleSprint(new Request('https://example.invalid/api/v1/play/sprint'),deps);assert.deepEqual(await response.json(),{enabled:true,dailyPerAccount:3,dailyGlobal:30,questions:5});
  assert.equal((await handleSprint(new Request('https://example.invalid/api/v1/play/sprint',{method:'POST',headers:{origin:'https://elsewhere.invalid'},body:'{}'}),deps)).status,403);
  assert.equal((await handleSprint(new Request('https://example.invalid/api/v1/play/sprint',{method:'POST',headers:{origin:env.APP_URL},body:'{}'}),deps)).status,401);
  assert.equal((await handleSprint(new Request('https://example.invalid/api/v1/play/sprint',{method:'POST'}),{...deps,env:{}})).status,503);
 });
});
