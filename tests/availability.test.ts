import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {weeklySlots,availabilityTimezone} from '../src/modules/mentoring/availability.ts';
import {MentoringService} from '../src/modules/mentoring/service.ts';
import {handleMentoring} from '../src/server/mentoring-http.ts';
import type {Account} from '../src/modules/identity/access.ts';
test('disponibilités : fuseau IANA, limites, tri, chevauchements et minuit',()=>{
 assert.equal(availabilityTimezone.parse('Africa/Conakry'),'Africa/Conakry');assert.ok(availabilityTimezone.parse('Europe/Paris'));
 for(const tz of ['Europe/Imaginaire','+03:00','<script>','x'.repeat(81)])assert.equal(availabilityTimezone.safeParse(tz).success,false);
 const slot={day:1,start:540,end:600};
 for(const input of [[{...slot,day:0}],[{...slot,day:8}],[{...slot,start:541}],[{...slot,end:540}],[{...slot,start:1380,end:60}],[{...slot,end:1320}],[{...slot,end:1441}],[slot,slot],[slot,{...slot,start:585,end:645}],Array(22).fill(slot),[{...slot,note:'unexpected'}]])assert.equal(weeklySlots.safeParse(input).success,false);
 assert.equal(weeklySlots.parse([slot,{...slot,start:600,end:660}]).length,2);
 assert.equal(weeklySlots.parse([{...slot,day:7,start:1380,end:1440}])[0].end,1440);
 assert.deepEqual(weeklySlots.parse([{...slot,day:7},{...slot,day:2},slot]).map(s=>s.day),[1,2,7]);
});
test('disponibilités mentor : brouillon, publication, rétrocompatibilité et autorisations',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);
 async function actor(role:string){const [u]=await db.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at,adult_access_approved_at) VALUES(gen_random_uuid()||'@example.invalid','fixture-unused',$1,now(),now()) RETURNING id`,[role]);return {id:u.id,role,email:'fixture@example.invalid',emailVerified:true,adultAccessApproved:true} as Account}
 const mentor=await actor('mentor'),other=await actor('mentor'),mentee=await actor('mentee'),admin=await actor('admin'),s=new MentoringService(db,false);
 const draft={publicName:'Mentor synthétique',biography:'Une présentation originale assez longue pour ce profil de test isolé.',experience:'Une expérience synthétique réservée à ces tests.',skills:['Communication'],expertise:['Orientation'],languages:['Français'],generalLocation:'Conakry',availability:'Disponibilités à confirmer ensemble',formats:['online'],professionalLinks:[],revision:0,availabilityTimezone:'Europe/Paris',weeklySlots:[{day:6,start:540,end:600},{day:1,start:600,end:660}]};
 async function own(){return await s.own(mentor) as {revision:number;weekly_slots:{day:number;start:number;end:number}[];availability_timezone:string;publication_status:string}}
 async function publish(){await s.submit(mentor,(await own()).revision);await s.review(admin,{id:mentor.id,revision:(await own()).revision,decision:'publish',note:'Examen synthétique du profil et des horaires pour ce test.'})}
 await t.test('seul le mentor actif édite son profil ; horaires non publics en brouillon',async()=>{
  await assert.rejects(s.save(mentee,draft),{status:403});await assert.rejects(s.save(null,draft),{status:401});
  await s.save(mentor,draft);const p=await own();assert.equal(p.availability_timezone,'Europe/Paris');assert.deepEqual(p.weekly_slots.map(x=>x.day),[1,6]);
  assert.equal((await s.search({weekday:'1'})).total,0);await assert.rejects(s.detail(mentor.id),{status:404});assert.equal(await s.own(other),null);
 });
 await t.test('validation du profil, lecture publique et filtre par jour du mentor',async()=>{
  await publish();const p=await s.detail(mentor.id);assert.equal(p.availability_timezone,'Europe/Paris');assert.equal((p.weekly_slots as unknown[]).length,2);assert.equal('email' in p,false);assert.equal('review_note' in p,false);
  assert.equal((await s.search({weekday:'1'})).total,1);assert.equal((await s.search({weekday:'6'})).total,1);assert.equal((await s.search({weekday:'2'})).total,0);
  await assert.rejects(s.search({weekday:'8'}));
 });
 await t.test('ancien client : les créneaux restent conservés, édition remise en brouillon',async()=>{
  const {weeklySlots:omitSlots,availabilityTimezone:omitTimezone,...legacy}=draft;void omitSlots;void omitTimezone;
  await s.save(mentor,{...legacy,revision:(await own()).revision,availability:'Un texte général modifié par un ancien client'});
  const p=await own();assert.equal(p.availability_timezone,'Europe/Paris');assert.equal(p.weekly_slots.length,2);assert.equal(p.publication_status,'draft');assert.equal((await s.search({weekday:'1'})).total,0);
  await publish();
 });
 await t.test('deux modifications simultanées : une seule version acceptée',async()=>{
  const revision=(await own()).revision;const outcomes=await Promise.allSettled([s.save(mentor,{...draft,revision,weeklySlots:[{day:3,start:600,end:660}]}),s.save(mentor,{...draft,revision,weeklySlots:[{day:4,start:600,end:660}]})]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);assert.equal((await own()).weekly_slots.length,1);
 });
 await t.test('retrait explicite de tous les créneaux et conservation du texte existant',async()=>{
  await s.save(mentor,{...draft,revision:(await own()).revision,weeklySlots:[],availabilityTimezone:'Africa/Conakry'});
  assert.deepEqual((await own()).weekly_slots,[]);await publish();assert.equal((await s.search({weekday:'1'})).total,0);assert.equal((await s.search({})).total,1);
 });
 await t.test('HTTP : accès anonyme public, validations, origine et rôle',async()=>{
  const config=()=>({origin:'https://example.invalid',secure:true,secret:'x'.repeat(48),registrationEnabled:false});
  const deps={db:async()=>db,config,enabled:()=>false,account:async()=>mentor};const base='https://example.invalid/api/v1/mentoring/';
  const publicResponse=await handleMentoring(new Request(base+'directory?weekday=1'),'directory',{...deps,account:async()=>{throw Error('Public read must not load session')}});assert.equal(publicResponse.status,200);assert.equal(publicResponse.headers.get('cache-control'),'no-store');
  const body={...draft,revision:(await own()).revision,weeklySlots:[{day:1,start:600,end:660},{day:1,start:630,end:690}]};
  const req=(origin=config().origin)=>new Request(base+'own-profile',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await handleMentoring(req(),'own-profile',deps)).status,400);assert.equal((await handleMentoring(req('https://elsewhere.invalid'),'own-profile',deps)).status,403);
  assert.equal((await handleMentoring(new Request(base+'own-profile'),'own-profile',{...deps,account:async()=>null})).status,401);
 });
 await t.test('contraintes de base et compte désactivé ne peuvent contourner le parcours',async()=>{
  await assert.rejects(db.query("UPDATE mentor_profile SET weekly_slots='{}'::jsonb WHERE user_id=$1",[mentor.id]));
  const revision=(await own()).revision;await db.query('UPDATE app_user SET disabled_at=now() WHERE id=$1',[mentor.id]);await assert.rejects(s.save(mentor,{...draft,revision}),{status:403});assert.equal((await s.search({})).total,0);
 });
});
