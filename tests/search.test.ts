import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedMessagingFixture} from './fixtures/messaging.ts';
import {seedPlayFixture} from './fixtures/play.ts';
import {LearningService} from '../src/modules/learning/service.ts';
import {SprintService} from '../src/modules/play/sprint.ts';
import {SearchService,searchInput} from '../src/modules/search/service.ts';
import {handleSearch} from '../src/server/search-http.ts';
test('recherche : saisie bornée, filtres stricts et pagination cohérente',()=>{
 assert.equal(searchInput.parse({q:'  calculs  '}).q,'calculs');
 for(const input of [{q:'x'},{q:'x'.repeat(101)},{q:'calculs',type:'private'},{q:'calculs',authorId:randomUUID()},{q:'calculs',page:2},{q:'calculs',type:'play',page:0}])assert.equal(searchInput.safeParse(input).success,false);
});
test('recherche publique : sources autorisées, projection et retrait immédiat',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);
 const f=await seedMessagingFixture(db),fixture=await seedPlayFixture(db),learning=new LearningService(db),s=new SearchService(db,{play:true,resources:true});
 await db.query("UPDATE mentor_profile SET biography='Les calculs font partie de cette présentation publique synthétique.',experience='EXPERIENCE_NON_PROJETEE',expertise=ARRAY['Sciences'] WHERE user_id=$1",[f.mentor.id]);
 const resource={summary:'Un guide original pour apprendre les calculs dans cette base de test isolée.',category:'Sciences',kind:'guide',body:'Un texte de calculs suffisamment long, réservé aux essais de recherche.',sourceUrl:'',rights:'Texte original autorisé pour les essais.',rightsConfirmed:true};
 const resources:string[]=[];
 for(let i=0;i<13;i++){const r=await learning.submitResource(f.mentor,{...resource,title:'Guide de calculs '+String(i).padStart(2,'0')});resources.push(r.id);await learning.review(f.admin,{id:r.id,type:'resource',decision:'published'})}
 await learning.submitResource(f.mentor,{...resource,title:'Calculs SOUMIS_NON_PUBLIC'});
 await learning.goal(f.mentee,{title:'Calculs OBJECTIF_CONFIDENTIEL',dueDate:null,status:'planned'});
 await learning.saveProfile(f.mentee,{displayName:'Compte de test',interests:'Calculs INTERETS_PRIVES',ambition:'Calculs AMBITION_PRIVEE'});
 await learning.post(f.mentee,{body:'Calculs PUBLICATION_COMMUNAUTAIRE_PRIVEE',parentId:null,publicationAccepted:true});
 await db.query("INSERT INTO quiz_game(author_id,title,description,category_id,level,duration_minutes) VALUES($1,'Calculs BROUILLON_NON_PUBLIC','Un brouillon synthétique qui doit rester privé.',$2,'beginner',3)",[f.admin.id,fixture.categoryId]);
 const ai=await new SprintService(db,async()=>({safeForPublic:true,title:'Calculs Sprint IA de test',description:'Un Sprint synthétique réservé aux tests de recherche.',questions:Array.from({length:5},(_,i)=>({stem:`Combien font ${i+1} plus un ?`,options:[String(i+2),String(i+3),String(i+4)],correctIndex:0,explanation:'Une unité ajoutée donne le nombre entier suivant.'}))}),'fixture/model').create(f.mentee,{requestKey:randomUUID(),categoryId:fixture.categoryId,topic:'Calculs',level:'beginner',publishAccepted:true});
 await t.test('trois groupes réels, quatre aperçus par groupe et liens directs',async()=>{
  const result=await s.search({q:'calculs'});assert.equal(result.total,16);assert.deepEqual(result.groups.map(g=>g.total),[2,13,1]);assert.equal(result.groups[1].items.length,4);
  assert.ok(result.groups[0].items.some(g=>g.aiGenerated===true));assert.equal(result.groups[1].items[0].href,'/bibliotheque/'+result.groups[1].items[0].id+'/');
  assert.equal(result.groups[2].items[0].href,'/mentors/'+f.mentor.id+'/');
  const text=JSON.stringify(result);for(const secret of ['SOUMIS_NON_PUBLIC','OBJECTIF_CONFIDENTIEL','INTERETS_PRIVES','AMBITION_PRIVEE','PUBLICATION_COMMUNAUTAIRE_PRIVEE','BROUILLON_NON_PUBLIC','EXPERIENCE_NON_PROJETEE','correct_index','explanation','password_hash','author_id','email_verified_at'])assert.equal(text.includes(secret),false,secret);
 });
 await t.test('recherche par domaine dans les trois sources publiques',async()=>{assert.deepEqual((await s.search({q:'Sciences'})).groups.map(g=>g.total),[2,13,1])});
 await t.test('pagination de la bibliothèque, sans résultat perdu ni doublon',async()=>{
  const first=await s.search({q:'calculs',type:'resource'}),second=await s.search({q:'calculs',type:'resource',page:2});
  assert.equal(first.groups[0].items.length,12);assert.equal(second.groups[0].items.length,1);assert.equal(new Set([...first.groups[0].items,...second.groups[0].items].map(x=>x.id)).size,13);
 });
 await t.test('motifs SQL traités comme du texte, absence de résultat honnête',async()=>{
  for(const q of ['%%','__',"' OR 1=1 --",'introuvable-xyz'])assert.equal((await s.search({q})).total,0);
 });
 await t.test('modules fermés exclus de la recherche, annuaire toujours public',async()=>{
  const result=await new SearchService(db,{play:false,resources:false}).search({q:'calculs'});
  assert.equal(result.total,1);assert.deepEqual(result.groups.map(g=>g.available),[false,false,true]);
 });
 await t.test('HTTP anonyme en lecture seule, validation avant DB et réponses non cachées',async()=>{
  let dbCalls=0;const deps={env:{PLAY_ENABLED:'true',LEARNING_ENABLED:'true'},db:async()=>{dbCalls++;return db}};
  const url='https://example.invalid/api/v1/search';
  assert.equal((await handleSearch(new Request(url,{method:'POST'}),deps)).status,405);
  assert.equal((await handleSearch(new Request(url+'?q=x'),deps)).status,400);assert.equal(dbCalls,0);
  const response=await handleSearch(new Request(url+'?q=calculs',{headers:{cookie:'untrusted=ignored'}}),deps);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).total,16);
 });
 await t.test('retrait des contenus et des profils effectif dès la recherche suivante',async()=>{
  await learning.review(f.admin,{id:resources[0],type:'resource',decision:'hidden'});
  await db.query("UPDATE quiz_game SET status='archived' WHERE id=$1",[ai.id]);
  await db.query("UPDATE mentor_profile SET publication_status='draft' WHERE user_id=$1",[f.mentor.id]);
  const result=await s.search({q:'calculs'});assert.deepEqual(result.groups.map(g=>g.total),[1,12,0]);
 });
});
