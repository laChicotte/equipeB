import {randomUUID} from 'node:crypto';
import {getDatabase} from '../src/server/database.ts';
import {MentoringService} from '../src/modules/mentoring/service.ts';
import type {Account} from '../src/modules/identity/access.ts';
import assert from 'node:assert/strict';
process.loadEnvFile('.env.local');
const rollback=new Error('Synthetic transaction rollback');
if(process.env.NODE_ENV==='production'||process.env.DB_DRIVER==='pglite')throw new Error('Development PostgreSQL required');
const db=await getDatabase();let verified=false;
try{
 try{await db.transaction(async sql=>{
  const service=new MentoringService({...sql,transaction:fn=>fn(sql),close:async()=>{}},true);
  async function fixture(role:string){const [user]=await sql.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at,adult_access_approved_at) VALUES($1,'unused-synthetic-hash',$2,now(),now()) RETURNING id`,[`transaction-${randomUUID()}@example.invalid`,role]);return {id:user.id,role,emailVerified:true,adultAccessApproved:true,email:'synthetic@example.invalid'} as Account}
  const mentor=await fixture('mentor'),mentee=await fixture('mentee'),admin=await fixture('admin');
  const profile={publicName:'Profil synthétique non commité',biography:'Profil transactionnel de test jamais publié aux autres connexions.',experience:'Expérience synthétique utilisée pour vérifier les requêtes PostgreSQL.',skills:['Communication'],expertise:['Orientation'],languages:['Français'],generalLocation:'Conakry',availability:'Samedi',formats:['online'],professionalLinks:[],revision:0};
  await service.save(mentor,profile);await service.submit(mentor,1);
  await service.review(admin,{id:mentor.id,revision:2,decision:'publish',note:'Vérification fictive dans une transaction annulée.'});
  assert.equal((await service.search({q:profile.publicName,language:'Français'})).total,1);
  await service.favorite(mentee,mentor.id,true);assert.equal((await service.favorites(mentee)).length,1);
  const request=await service.createRequest(mentee,{mentorId:mentor.id,goal:'Définir un objectif synthétique sans données personnelles réelles.'});
  await service.transition(mentor,{id:request.id,status:'accepted'});
  assert.equal((await service.programs(mentee)).length,1);
  await service.save(mentor,{...profile,revision:3});assert.equal((await service.search({q:profile.publicName})).total,0);
  assert.equal((await service.programs(mentee) as {status:string}[])[0].status,'suspended');
  verified=true;throw rollback;
 })}catch(error){if(error!==rollback)throw error}
 if(!verified)throw new Error('Not verified');
 console.log('PostgreSQL natif : profil, revue, recherche, favori, demande, acceptation et suspension vérifiés. Transaction annulée ; aucun profil synthétique publié aux autres connexions, aucun e-mail envoyé.');
}catch{console.error('Vérification mentorat PostgreSQL échouée. Transaction annulée, aucun identifiant affiché.');process.exitCode=1}
finally{await db.close()}
