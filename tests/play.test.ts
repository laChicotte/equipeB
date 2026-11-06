import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {handlePlay,playConfig} from '../src/server/play-http.ts';
import {MentoringService} from '../src/modules/mentoring/service.ts';
import type {Account} from '../src/modules/identity/access.ts';
import {questionSchema,gameSchema} from '../src/modules/play/schemas.ts';
import {purgeExpiredGuestAttempts} from '../src/modules/play/retention.ts';
const qinput=(categoryId:string)=>({categoryId,level:'beginner',stem:'Combien font deux plus deux ?',options:['4','5','6'],correctIndex:0,explanation:'Deux unités ajoutées à deux unités donnent quatre unités.',source:''});
test('Play : préversion fermée sans origine ni secret de production',()=>{
 const keys=['NODE_ENV','PLAY_ENABLED','APP_URL','AUTH_SECRET'];const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{Object.assign(process.env,{NODE_ENV:'production',PLAY_ENABLED:'false',APP_URL:'',AUTH_SECRET:''});assert.equal(playConfig().enabled,false);assert.equal(playConfig().origin,'');process.env.PLAY_ENABLED='true';assert.throws(()=>playConfig())}
 finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});
test('Play : trois choix distincts, une seule correction et schémas stricts',()=>{
 const input=qinput('00000000-0000-4000-8000-000000000001');
 for(const overrides of [{options:['4','5']},{options:['4','5','6','7']},{options:['4',' 4 ','5']},{correctIndex:3},{correctIndex:-1},{correctAnswers:[0,1]},{source:'javascript:alert(1)'},{source:'https://user:password@example.invalid'}])assert.equal(questionSchema.safeParse({...input,...overrides}).success,false);
 assert.equal(gameSchema.safeParse({title:'Quiz',description:'Une description suffisamment longue.',categoryId:input.categoryId,level:'beginner',durationMinutes:2,questionIds:[]}).success,false);
});
test('Play : parcours public et modération sur base isolée',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);const play=new PlayService(db);
 async function actor(role:string,adult=true){const [u]=await db.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at,adult_access_approved_at) VALUES(gen_random_uuid()||'@example.invalid','fixture-unused',$1,now(),CASE WHEN $2 THEN now() ELSE NULL END) RETURNING id`,[role,adult]);return {id:u.id,role,email:'synthetic@example.invalid',emailVerified:true,adultAccessApproved:adult} as Account}
 const admin=await actor('admin'),admin2=await actor('admin'),mentor=await actor('mentor'),mentee=await actor('mentee'),other=await actor('mentee'),minor=await actor('mentee',false),unverified=await actor('mentor');
 await db.query("INSERT INTO mentor_profile(user_id,public_name,verification_status,publication_status,verified_by,verified_at,expertise) VALUES($1,'Mentor de test','verified','published',$2,now(),ARRAY['Sciences'])",[mentor.id,admin.id]);
 const categories=await play.categories() as {id:string;name:string}[];const category=categories.find(c=>c.name==='Sciences')!.id;let versions:string[]=[];let gameId='';let attempt='';const owner=randomBytes(32).toString('hex'),stranger=randomBytes(32).toString('hex');
 await t.test('mentor vérifié uniquement, brouillon et soumission',async()=>{
  await assert.rejects(play.saveQuestion(unverified,qinput(category)),{status:403});await assert.rejects(play.saveQuestion(mentee,qinput(category)),{status:403});
  const first=await play.saveQuestion(mentor,qinput(category));versions.push(first.id);
  const second=await play.saveQuestion(mentor,{...qinput(category),stem:'Combien font trois plus trois ?',options:['6','7','8']});versions.push(second.id);
  const third=await play.saveQuestion(admin,{...qinput(category),stem:'Combien font quatre plus quatre ?',options:['8','9','10']});versions.push(third.id);
  for(const id of versions)await play.submitQuestion(id===third.id?admin:mentor,id);
 });
 await t.test('auto-approbation interdite, relecture distincte et audit',async()=>{
  await assert.rejects(play.reviewQuestion(mentor,{id:versions[0],decision:'approved',note:'Auto-approbation fictive interdite.'}),{status:403});
  await assert.rejects(play.reviewQuestion(admin,{id:versions[2],decision:'approved',note:'Auto-approbation fictive interdite.'}),{status:403});
  await play.reviewQuestion(admin,{id:versions[0],decision:'in_review',note:'Examen pédagogique en cours pour ce test.'});
  for(const [i,id] of versions.entries())await play.reviewQuestion(i===2?admin2:admin,{id,decision:'approved',note:'Exactitude contrôlée dans ce jeu synthétique.'});
  assert.equal((await db.query("SELECT id FROM audit_event WHERE action='play.question.approved'")).length,3);
 });
 await t.test('contraintes SQL : trois choix, unicité et versions immuables',async()=>{
  const [v]=await db.query<{question_id:string}>('SELECT question_id FROM quiz_question_version WHERE id=$1',[versions[0]]);
  for(const [options,index] of [[['a','b'],0],[['a','a','b'],0],[['a','b','c'],3]] as const){
   await assert.rejects(db.query("INSERT INTO quiz_question_version(question_id,version,category_id,level,stem,options,correct_index,explanation,created_by) VALUES($1,99,$2,'beginner','Une question synthétique',$3,$4,'Une explication assez longue pour ce test.',$5)",[v.question_id,category,options,index,mentor.id]));
  }
  await assert.rejects(db.query("UPDATE quiz_question_version SET stem='Modification rétroactive interdite' WHERE id=$1",[versions[0]]));
  await assert.rejects(db.query("UPDATE quiz_question_version SET reviewed_by=$2 WHERE id=$1",[versions[0],mentor.id]));
 });
 const gameInput=()=>({title:'Quiz synthétique de calcul',description:'Un quiz réservé aux vérifications du logiciel TalentLink.',categoryId:category,level:'beginner',durationMinutes:3,pointsPerAnswer:10,questionIds:versions});
 await t.test('composition valide et publication contrôlée',async()=>{
  const pending=await play.saveQuestion(mentor,{...qinput(category),stem:'Combien font cinq plus cinq ?',options:['10','11','12']});
  await assert.rejects(play.createGame(mentor,{...gameInput(),questionIds:[pending.id]}),{status:400});
  const game=await play.createGame(mentor,gameInput());gameId=game.id;assert.equal((await play.catalog({})).total,0);
  await play.submitGame(mentor,gameId);await assert.rejects(play.reviewGame(mentor,gameId,true),{status:403});await play.reviewGame(admin,gameId,true);
  assert.equal((await play.catalog({category,level:'beginner',maxMinutes:5,maxQuestions:5})).total,1);assert.equal((await play.catalog({maxMinutes:1})).total,0);
  const publicPayload=JSON.stringify(await play.catalog({}));for(const secret of ['correct_index','explanation','options','author_id'])assert.ok(!publicPayload.includes(secret));
 });
 await t.test('visiteur sans compte, aucune réponse anticipée ni contact collecté',async()=>{
  attempt=(await play.start(owner,null,{gameId})).id;
  const initial=await play.state(owner,null,attempt);const question=initial.question as {options:string[]};
  assert.equal(question.options.length,3);assert.equal(initial.score,0);assert.equal(initial.saved,false);
  for(const key of ['correct_index','correctIndex','explanation','source'])assert.ok(!JSON.stringify(initial).includes(key));
  const [row]=await db.query<{user_id:string|null}>('SELECT user_id FROM game_attempt WHERE id=$1',[attempt]);assert.equal(row.user_id,null);
  await assert.rejects(play.state(stranger,null,attempt),{status:404});
  await assert.rejects(play.answer(owner,null,{attemptId:attempt,index:2,choice:0}),{status:409});
 });
 await t.test('correction, explication et rejeu idempotent concurrent',async()=>{
  const results=await Promise.all([play.answer(owner,null,{attemptId:attempt,index:0,choice:0}),play.answer(owner,null,{attemptId:attempt,index:0,choice:0})]);
  assert.equal(results[0].points,10);assert.equal(results[0].correct,true);assert.ok(results[0].explanation.length>20);
  assert.equal((await play.state(owner,null,attempt)).score,10);await assert.rejects(play.answer(owner,null,{attemptId:attempt,index:0,choice:1}),{status:409});
 });
 await t.test('version stable, retrait sans casser la partie et résumé final',async()=>{
  const [original]=await db.query<{question_id:string}>('SELECT question_id FROM quiz_question_version WHERE id=$1',[versions[0]]);
  const corrected=await play.saveQuestion(admin,{...qinput(category),questionId:original.question_id,options:['5','4','6'],correctIndex:1});
  await play.submitQuestion(admin,corrected.id);await assert.rejects(play.reviewQuestion(admin,{id:corrected.id,decision:'approved',note:'Interdit de valider sa propre correction.'}),{status:403});
  await play.reviewQuestion(admin2,{id:corrected.id,decision:'approved',note:'Nouvelle version contrôlée par une autre personne.'});
  await play.reviewGame(admin,gameId,false);assert.equal((await play.catalog({})).total,0);
  const second=await play.answer(owner,null,{attemptId:attempt,index:1,choice:1});assert.equal(second.points,0);
  await play.answer(owner,null,{attemptId:attempt,index:2,choice:0});const summary=await play.state(owner,null,attempt);
  assert.equal(summary.completed,true);assert.equal(summary.score,20);assert.equal(summary.correct,2);assert.equal(summary.wrong,1);assert.equal(summary.percentage,67);assert.equal((summary.results as unknown[]).length,3);
  const rec=await play.recommendations(owner,null,attempt,true);assert.equal(rec.expertise,'Sciences');assert.ok(rec.items.some(m=>m.id===mentor.id));
  assert.ok(rec.directory.includes('Sciences'));await play.recommendations(owner,null,attempt,true);
 });
 let savedId='';
 await t.test('historique facultatif adulte et isolation de deux utilisateurs',async()=>{
  const newGame=await play.createGame(admin,gameInput());await play.submitGame(admin,newGame.id);await play.reviewGame(admin2,newGame.id,true);gameId=newGame.id;
  await assert.rejects(play.start(owner,minor,{gameId,saveHistory:true}),{status:403});await assert.rejects(play.start(owner,null,{gameId,saveHistory:true}),{status:401});
  savedId=(await play.start(owner,mentee,{gameId,saveHistory:true})).id;
  await assert.rejects(play.state(owner,other,savedId),{status:404});assert.equal((await play.history(other)).length,0);
  assert.equal((await play.history(mentee)).length,1);await assert.rejects(play.history(minor),{status:403});
  for(let index=0;index<3;index++)await play.answer(owner,mentee,{attemptId:savedId,index,choice:0});
 });
 await t.test('attribution explicite uniquement et agrégats sans coordonnées',async()=>{
  const mentoring=new MentoringService(db,true);
  await assert.rejects(mentoring.createRequest(other,{mentorId:mentor.id,goal:'Un objectif cohérent pour approfondir les sciences.',sourceAttemptId:savedId}),{status:403});
  await mentoring.createRequest(mentee,{mentorId:mentor.id,goal:'Un objectif cohérent pour approfondir les sciences.',sourceAttemptId:savedId});
  const stats=await play.stats(admin) as {started:number;completed:number;mentor_clicks:number;attributed:number};assert.equal(stats.started,2);assert.equal(stats.completed,2);assert.equal(stats.mentor_clicks,1);assert.equal(stats.attributed,1);
  const serialized=JSON.stringify(stats);assert.ok(!serialized.includes('@'));assert.ok(!serialized.includes('owner_hash'));
 });
 await t.test('retrait de question et catégorie, expiration des parties',async()=>{
  await play.reviewQuestion(admin,{id:versions[0],decision:'archived',note:'Retrait synthétique pour tester la visibilité.'});assert.equal((await play.catalog({})).total,0);
  await assert.rejects(play.start(owner,null,{gameId}),{status:404});
  await db.query("UPDATE game_attempt SET expires_at=now()-interval '1 second' WHERE id=$1",[attempt]);await assert.rejects(play.state(owner,null,attempt),{status:410});
  await play.category(admin,{id:category,name:'Sciences',expertise:'Sciences',active:false});assert.ok(!(await play.categories() as {id:string}[]).some(c=>c.id===category));
 });
 await t.test('HTTP : fermeture, cookie HttpOnly, CSRF et score injecté refusé',async()=>{
  const config={origin:'http://127.0.0.1:3000',secure:false,secret:randomBytes(32).toString('hex'),enabled:true};
  const deps={db:async()=>db,config:()=>config,account:async()=>null};
  const post=(action:string,input:unknown,origin=config.origin,cookie='')=>handlePlay(new Request(config.origin,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:JSON.stringify(input)}),action,deps);
  assert.equal((await post('start',{gameId},'https://other.invalid')).status,403);
  assert.equal((await post('answer',{attemptId:attempt,index:0,choice:0,points:100},config.origin,'tl_play='+owner)).status,400);
  const closed={...deps,config:()=>({...config,enabled:false})};assert.equal((await handlePlay(new Request(config.origin),'catalog',closed)).status,503);
  assert.equal((await handlePlay(new Request(config.origin),'questions',deps)).status,401);
  assert.equal((await handlePlay(new Request(config.origin+'?id='+savedId),'state',deps)).status,404);
  await play.category(admin,{id:category,name:'Sciences',expertise:'Sciences',active:true});
  const fixtureGame=await play.createGame(admin,{...gameInput(),questionIds:[versions[1]]});await play.submitGame(admin,fixtureGame.id);await play.reviewGame(admin2,fixtureGame.id,true);
  const started=await post('start',{gameId:fixtureGame.id});assert.equal(started.status,201);assert.match(started.headers.get('set-cookie')!,/HttpOnly; Path=\/; SameSite=Lax/);
  const secureDeps={...deps,config:()=>({...config,origin:'https://talentlink.example.invalid',secure:true})};
  const secure=await handlePlay(new Request('https://talentlink.example.invalid',{method:'POST',headers:{Origin:'https://talentlink.example.invalid','Content-Type':'application/json'},body:JSON.stringify({gameId:fixtureGame.id})}),'start',secureDeps);
  assert.equal(secure.status,201);assert.match(secure.headers.get('set-cookie')!,/^__Host-tl_play=/);assert.match(secure.headers.get('set-cookie')!,/; Secure$/);
  assert.equal(await purgeExpiredGuestAttempts(db),1);assert.equal((await play.history(mentee)).length,1);
 });
});
