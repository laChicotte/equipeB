import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {MentoringService} from '../src/modules/mentoring/service.ts';
import {profileSchema} from '../src/modules/mentoring/schemas.ts';
import type {Account} from '../src/modules/identity/access.ts';
import {handleMentoring} from '../src/server/mentoring-http.ts';
const draft={publicName:'Mentor synthétique',biography:'Un profil exclusivement synthétique pour les tests de mentorat.',experience:'Expérience synthétique de transmission des compétences.',skills:['Communication'],expertise:['Orientation'],languages:['Français'],generalLocation:'Conakry',availability:'Samedi matin',formats:['online'],professionalLinks:['https://example.invalid/parcours'],revision:0};
test('profil : schéma strict, liens sûrs et aucune auto-validation',()=>{
 for(const override of [{verification_status:'verified'},{adult_access_approved_at:'today'},{professionalLinks:['javascript:alert(1)']},{professionalLinks:['https://user:password@example.invalid']},{skills:[]},{formats:[]},{biography:'court'}])assert.equal(profileSchema.safeParse({...draft,...override}).success,false);
});
test('mentorat : examen, visibilité publique et isolation des demandes',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);
 async function actor(role:string,adult=true){const [row]=await db.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at,adult_declared_at,adult_access_approved_at) VALUES(gen_random_uuid()||'@example.invalid','unused-fixture-hash',$1,now(),now(),CASE WHEN $2 THEN now() ELSE NULL END) RETURNING id`,[role,adult]);return {id:row.id,role,email:'private@example.invalid',emailVerified:true,adultAccessApproved:adult} as Account}
 const mentor=await actor('mentor'),mentee=await actor('mentee'),other=await actor('mentee'),admin=await actor('admin'),unapproved=await actor('mentee',false);
 const service=new MentoringService(db,true),closed=new MentoringService(db,false);
 async function revision(){return (await service.own(mentor) as {revision:number}).revision}
 await t.test('brouillon privé, rôles et écriture optimiste',async()=>{
  await assert.rejects(service.save(mentee,draft),{status:403});await assert.rejects(service.own(null),{status:401});
  await service.save(mentor,draft);assert.equal((await service.search({})).total,0);await assert.rejects(service.detail(mentor.id),{status:404});
  await assert.rejects(service.save(mentor,draft),{status:409});
  await service.submit(mentor,await revision());await assert.rejects(service.submit(mentor,await revision()),{status:409});
 });
 await t.test('publication administrative et données privées exclues',async()=>{
  await assert.rejects(service.review(mentor,{id:mentor.id,revision:await revision(),decision:'publish',note:'Contrôle fictif réalisé pour le test.'}),{status:403});
  await db.query('UPDATE app_user SET adult_access_approved_at=NULL WHERE id=$1',[mentor.id]);
  await assert.rejects(service.review(admin,{id:mentor.id,revision:await revision(),decision:'publish',note:'Contrôle fictif réalisé pour le test.'}),{status:403});
  await db.query('UPDATE app_user SET adult_access_approved_at=now() WHERE id=$1',[mentor.id]);
  await service.review(admin,{id:mentor.id,revision:await revision(),decision:'publish',note:'Contrôle fictif réalisé pour le test.'});
  const found=await service.search({q:'synthétique',language:'français',expertise:'orientation',location:'conakry',availability:'samedi',format:'online'});assert.equal(found.total,1);
  const value=JSON.stringify(found);for(const key of ['email','verified_by','review_note','password_hash','adult_access_approved_at'])assert.ok(!value.includes(key));
  assert.equal((await service.search({q:"' OR true--"})).total,0);assert.equal((await service.search({q:'%'})).total,0);assert.equal((await service.search({page:2})).items.length,0);
  assert.equal((await service.detail(mentor.id) as {public_name:string}).public_name,draft.publicName);
  await service.favorite(mentee,mentor.id,true);await service.favorite(mentee,mentor.id,true);assert.equal((await service.favorites(mentee)).length,1);assert.equal((await service.favorites(other)).length,0);await assert.rejects(service.favorite(unapproved,mentor.id,true),{status:403});
 });
 let requestId='';
 await t.test('accès adulte, fermeture et doublon de demande',async()=>{
  const input={mentorId:mentor.id,goal:'Préparer un projet professionnel cohérent avec mes compétences.'};
  await assert.rejects(closed.createRequest(mentee,input),{code:'mentoring_closed'});await assert.rejects(service.createRequest(unapproved,input),{status:403});await assert.rejects(service.createRequest(mentor,input),{status:403});
  const outcomes=await Promise.allSettled([service.createRequest(mentee,input),service.createRequest(mentee,input)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
  requestId=(outcomes.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<{id:string}>).value.id;
  assert.equal((await service.requests(other)).length,0);assert.equal((await service.requests(mentor)).length,1);
  await assert.rejects(service.transition(other,{id:requestId,status:'accepted'}),{status:403});await assert.rejects(service.transition(mentee,{id:requestId,status:'accepted'}),{status:403});
 });
 await t.test('acceptation atomique et programme unique',async()=>{
  await service.transition(mentor,{id:requestId,status:'accepted'});await assert.rejects(service.transition(mentor,{id:requestId,status:'accepted'}),{status:409});
  const programs=await service.programs(mentee) as {id:string;status:string;goal:string}[];assert.equal(programs.length,1);assert.equal((await service.programs(other)).length,0);
  await assert.rejects(service.updateProgram(other,{id:programs[0].id,status:'active',goal:'Nouvel objectif non autorisé pour ce programme.'}),{status:403});
  await service.save(mentor,{...draft,revision:await revision()});assert.equal((await service.search({})).total,0);
  assert.equal((await service.favorites(mentee)).length,0);
  assert.equal((await service.programs(mentee) as {status:string}[])[0].status,'suspended');
  await assert.rejects(service.updateProgram(mentor,{id:programs[0].id,goal:programs[0].goal,status:'active'}),{status:403});
  await service.updateProgram(mentee,{id:programs[0].id,goal:programs[0].goal,status:'completed'});await assert.rejects(service.updateProgram(mentor,{id:programs[0].id,goal:programs[0].goal,status:'active'}),{status:409});
 });
 await t.test('retrait, refus, annulation et invalidation des comptes',async()=>{
  await service.submit(mentor,await revision());await service.review(admin,{id:mentor.id,revision:await revision(),decision:'publish',note:'Nouvel examen fictif pour les tests.'});
  const first=await service.createRequest(other,{mentorId:mentor.id,goal:'Définir mes objectifs pour le prochain trimestre de formation.'});
  await service.transition(mentor,{id:first.id,status:'declined'});await assert.rejects(service.transition(mentor,{id:first.id,status:'accepted'}),{status:409});
  const second=await service.createRequest(other,{mentorId:mentor.id,goal:'Explorer les parcours de formation adaptés à mon projet.'});await closed.transition(other,{id:second.id,status:'cancelled'});
  await service.review(admin,{id:mentor.id,revision:await revision(),decision:'suspend',note:'Retrait synthétique pour vérifier la sécurité.'});assert.equal((await service.search({})).total,0);
  await db.query('UPDATE app_user SET disabled_at=now() WHERE id=$1',[mentor.id]);await assert.rejects(service.own(mentor),{status:403});
 });
 await t.test('HTTP : session serveur, CSRF, schéma et méthodes',async()=>{
  const config={origin:'http://127.0.0.1:3000',secure:false,registrationEnabled:true,secret:'synthetic-secret-not-for-production-2026'};
  const deps={db:async()=>db,config:()=>config,account:async()=>other,enabled:()=>false};
  const post=(action:string,input:unknown,origin=config.origin)=>handleMentoring(new Request(config.origin,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)}),action,deps);
  assert.equal((await post('request',{},'https://evil.invalid')).status,403);assert.equal((await post('own-profile',{role:'admin'})).status,400);
  assert.equal((await post('request',{mentorId:mentor.id,goal:'Un objectif suffisamment long pour être validé.'})).status,403);
  const unauthorized={...deps,account:async()=>null};assert.equal((await handleMentoring(new Request(config.origin),'requests',unauthorized)).status,401);
  assert.equal((await handleMentoring(new Request(config.origin),'unknown',deps)).status,404);
  const invalid=await handleMentoring(new Request(config.origin+'?id=bad'),'profile',deps);assert.equal(invalid.status,400);
  const directory=await handleMentoring(new Request(config.origin),'directory',deps);assert.equal(directory.status,200);assert.equal(directory.headers.get('cache-control'),'no-store');
 });
});
