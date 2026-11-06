import type {Database,Sql} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {AuthError} from '../identity/errors.ts';
import {profileSchema,reviewSchema,requestSchema,transitionSchema,programSchema,searchSchema} from './schemas.ts';
const deny=()=>new AuthError(403,'forbidden','Cette action n’est pas autorisée.');
const conflict=()=>new AuthError(409,'conflict','La situation a changé. Recharge la page avant de réessayer.');
const publicColumns=`p.user_id AS id,p.public_name,p.biography,p.experience,p.skills,p.expertise,p.languages,p.general_location,p.availability,p.formats,p.professional_links,p.verification_status`;
const visible=`p.publication_status='published' AND p.verification_status='verified' AND u.disabled_at IS NULL AND u.role='mentor' AND u.email_verified_at IS NOT NULL AND u.adult_access_approved_at IS NOT NULL`;
export class MentoringService {
 db:Database;enabled:boolean;
 constructor(db:Database,enabled=false){this.db=db;this.enabled=enabled}
 async actor(sql:Sql,account:Account|null,role?:string,adult=false,exclusive=false){
  if(!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
  const [user]=await sql.query<{id:string;role:string;adult_access_approved_at:unknown}>(`SELECT id,role,adult_access_approved_at FROM app_user WHERE id=$1 AND disabled_at IS NULL AND email_verified_at IS NOT NULL FOR ${exclusive?'UPDATE':'SHARE'}`,[account.id]);
  if(!user||(role&&user.role!==role)||(adult&&!user.adult_access_approved_at))throw deny();return user;
 }
 async search(input:unknown){
  const v=searchSchema.parse(input);const values:unknown[]=[];const where=[visible];
  const add=(value:unknown,condition:(p:string)=>string)=>{values.push(value);where.push(condition('$'+values.length))};
  if(v.q)add('%'+v.q.replace(/[\\%_]/g,'\\$&')+'%',p=>`(p.public_name ILIKE ${p} OR p.biography ILIKE ${p} OR array_to_string(p.skills,' ') ILIKE ${p})`);
  for(const [value,column] of [[v.expertise,'expertise'],[v.language,'languages']] as const)if(value)add(value,p=>`EXISTS(SELECT 1 FROM unnest(p.${column}) t WHERE lower(t)=lower(${p}))`);
  for(const [value,column] of [[v.location,'general_location'],[v.availability,'availability']] as const)if(value)add('%'+value.replace(/[\\%_]/g,'\\$&')+'%',p=>`p.${column} ILIKE ${p}`);
  if(v.format)add(v.format,p=>`${p}=ANY(p.formats)`);
  const predicate=where.join(' AND ');
  return this.db.transaction(async sql=>{
   const [count]=await sql.query<{total:string}>(`SELECT count(*) AS total FROM mentor_profile p JOIN app_user u ON u.id=p.user_id WHERE ${predicate}`,values);
   const items=await sql.query(`SELECT ${publicColumns} FROM mentor_profile p JOIN app_user u ON u.id=p.user_id WHERE ${predicate} ORDER BY p.public_name,p.user_id LIMIT 12 OFFSET $${values.length+1}`,[...values,(v.page-1)*12]);
   return {items,total:Number(count.total),page:v.page,pageSize:12};
  });
 }
 async detail(id:string){const [profile]=await this.db.query(`SELECT ${publicColumns} FROM mentor_profile p JOIN app_user u ON u.id=p.user_id WHERE ${visible} AND p.user_id=$1`,[id]);if(!profile)throw new AuthError(404,'not_found','Ce profil n’est pas disponible.');return profile}
 async own(account:Account|null){return this.db.transaction(async sql=>{const user=await this.actor(sql,account,'mentor');const [profile]=await sql.query('SELECT * FROM mentor_profile WHERE user_id=$1',[user.id]);return profile||null})}
 async favorites(account:Account|null){return this.db.transaction(async sql=>{const user=await this.actor(sql,account,undefined,true);return sql.query(`SELECT ${publicColumns} FROM mentor_favorite f JOIN mentor_profile p ON p.user_id=f.mentor_id JOIN app_user u ON u.id=p.user_id WHERE f.user_id=$1 AND ${visible} ORDER BY f.created_at DESC LIMIT 100`,[user.id])})}
 async favorite(account:Account|null,id:string,add:boolean){return this.db.transaction(async sql=>{const user=await this.actor(sql,account,undefined,true);if(add){await this.eligible(sql,id);await sql.query('INSERT INTO mentor_favorite(user_id,mentor_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.id,id])}else await sql.query('DELETE FROM mentor_favorite WHERE user_id=$1 AND mentor_id=$2',[user.id,id]);return {message:add?'Mentor ajouté aux favoris.':'Mentor retiré des favoris.'}})}
 async save(account:Account|null,input:unknown){const v=profileSchema.parse(input);return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,'mentor',false,true);
  // User lock serializes initial insert as well as concurrent saves.
  const [old]=await sql.query<{revision:number}>('SELECT revision FROM mentor_profile WHERE user_id=$1 FOR UPDATE',[user.id]);
  if((old?.revision||0)!==v.revision)throw conflict();
  const values=[user.id,v.publicName,v.biography,v.experience,v.skills,v.expertise,v.languages,v.generalLocation,v.availability,v.formats,v.professionalLinks];
  await sql.query(`INSERT INTO mentor_profile(user_id,public_name,biography,experience,skills,expertise,languages,general_location,availability,formats,professional_links)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(user_id) DO UPDATE SET public_name=$2,biography=$3,experience=$4,skills=$5,expertise=$6,languages=$7,general_location=$8,availability=$9,formats=$10,professional_links=$11,
   publication_status='draft',verification_status='pending',verified_by=NULL,verified_at=NULL,review_note='',revision=mentor_profile.revision+1,updated_at=now()`,values);
  await this.suspendPrograms(sql,user.id);
  await this.audit(sql,user.id,'mentor.profile.saved',user.id);return {message:'Profil enregistré en brouillon. Toute modification nécessite une nouvelle validation.'};
 })}
 async submit(account:Account|null,revision:number){return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,'mentor');
  const [p]=await sql.query('SELECT * FROM mentor_profile WHERE user_id=$1 FOR UPDATE',[user.id]);
  if(!p||p.revision!==revision)throw conflict();
  profileSchema.parse({publicName:p.public_name,biography:p.biography,experience:p.experience,skills:p.skills,expertise:p.expertise,languages:p.languages,generalLocation:p.general_location,availability:p.availability,formats:p.formats,professionalLinks:p.professional_links,revision:p.revision});
  const rows=await sql.query(`UPDATE mentor_profile SET publication_status='submitted',revision=revision+1,updated_at=now() WHERE user_id=$1 AND revision=$2 AND publication_status IN ('draft','rejected','suspended') RETURNING user_id`,[user.id,revision]);
  if(!rows.length)throw conflict();await this.audit(sql,user.id,'mentor.profile.submitted',user.id);return {message:'Profil transmis pour examen. Aucune publication automatique.'};
 })}
 async queue(account:Account|null){return this.db.transaction(async sql=>{await this.actor(sql,account,'admin');return sql.query(`SELECT p.*,u.adult_access_approved_at FROM mentor_profile p JOIN app_user u ON u.id=p.user_id WHERE p.publication_status IN ('submitted','published') ORDER BY p.updated_at LIMIT 100`)})}
 async review(account:Account|null,input:unknown){const v=reviewSchema.parse(input);return this.db.transaction(async sql=>{
  const admin=await this.actor(sql,account,'admin');if(admin.id===v.id)throw deny();
  const [user]=await sql.query<{adult_access_approved_at:unknown}>(`SELECT adult_access_approved_at FROM app_user WHERE id=$1 AND role='mentor' AND disabled_at IS NULL AND email_verified_at IS NOT NULL FOR SHARE`,[v.id]);
  const [p]=await sql.query<{revision:number;publication_status:string}>('SELECT revision,publication_status FROM mentor_profile WHERE user_id=$1 FOR UPDATE',[v.id]);
  if(!p||p.revision!==v.revision)throw conflict();
  if(v.decision==='publish'&&(!user?.adult_access_approved_at||p.publication_status!=='submitted'))throw deny();
  if(v.decision==='reject'&&p.publication_status!=='submitted')throw conflict();
  if(v.decision==='suspend'&&p.publication_status!=='published')throw conflict();
  await sql.query(`UPDATE mentor_profile SET publication_status=$2,verification_status=$3,verified_by=$4,verified_at=CASE WHEN $4::uuid IS NULL THEN NULL ELSE now() END,review_note=$5,revision=revision+1,updated_at=now() WHERE user_id=$1`,[v.id,v.decision==='publish'?'published':v.decision==='reject'?'rejected':'suspended',v.decision==='publish'?'verified':v.decision==='reject'?'rejected':'pending',v.decision==='publish'?admin.id:null,v.note]);
  if(v.decision!=='publish')await this.suspendPrograms(sql,v.id);
  await this.audit(sql,admin.id,'mentor.review.'+v.decision,v.id);return {message:'Décision enregistrée.'};
 })}
 private gate(){if(!this.enabled)throw new AuthError(403,'mentoring_closed','Les mises en relation ne sont pas encore ouvertes.')}
 async eligible(sql:Sql,id:string){const [p]=await sql.query(`SELECT p.user_id FROM mentor_profile p JOIN app_user u ON u.id=p.user_id WHERE ${visible} AND p.user_id=$1 FOR SHARE OF p,u`,[id]);if(!p)throw deny()}
 async createRequest(account:Account|null,input:unknown){this.gate();const v=requestSchema.parse(input);return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,'mentee',true);if(user.id===v.mentorId)throw deny();await this.eligible(sql,v.mentorId);
  if(v.sourceAttemptId&&!(await sql.query('SELECT id FROM game_attempt WHERE id=$1 AND user_id=$2 AND completed_at IS NOT NULL',[v.sourceAttemptId,user.id])).length)throw deny();
  const rows=await sql.query<{id:string}>(`INSERT INTO mentoring_request(mentee_id,mentor_id,goal,source_attempt_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,[user.id,v.mentorId,v.goal,v.sourceAttemptId||null]);
  if(!rows[0])throw conflict();await this.audit(sql,user.id,'mentoring.requested',rows[0].id);return {id:rows[0].id,message:'Demande envoyée. Elle est visible dans l’espace du mentor.'};
 })}
 async requests(account:Account|null){return this.db.transaction(async sql=>{const user=await this.actor(sql,account,undefined,true);return sql.query(`SELECT r.*,p.public_name FROM mentoring_request r JOIN mentor_profile p ON p.user_id=r.mentor_id WHERE r.mentee_id=$1 OR r.mentor_id=$1 ORDER BY r.created_at DESC LIMIT 100`,[user.id])})}
 async transition(account:Account|null,input:unknown){const v=transitionSchema.parse(input);if(v.status!=='cancelled')this.gate();return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,undefined,true);const [r]=await sql.query<{id:string;status:string;mentee_id:string;mentor_id:string;goal:string}>('SELECT * FROM mentoring_request WHERE id=$1 FOR UPDATE',[v.id]);
  if(!r||(v.status==='cancelled'?r.mentee_id!==user.id:r.mentor_id!==user.id))throw deny();
  if(r.status!=='pending')throw conflict();
  if(v.status==='accepted'){await this.eligible(sql,r.mentor_id);await this.actor(sql,{id:r.mentee_id} as Account,'mentee',true)}
  await sql.query('UPDATE mentoring_request SET status=$2,updated_at=now() WHERE id=$1',[r.id,v.status]);
  if(v.status==='accepted')await sql.query('INSERT INTO mentoring_program(request_id,goal) VALUES($1,$2)',[r.id,r.goal]);
  await this.audit(sql,user.id,'mentoring.request.'+v.status,r.id);return {message:'Demande mise à jour.'};
 })}
 async programs(account:Account|null){return this.db.transaction(async sql=>{const user=await this.actor(sql,account,undefined,true);return sql.query(`SELECT g.*,r.mentee_id,r.mentor_id,p.public_name FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id JOIN mentor_profile p ON p.user_id=r.mentor_id WHERE r.mentee_id=$1 OR r.mentor_id=$1 ORDER BY g.created_at DESC LIMIT 100`,[user.id])})}
 async updateProgram(account:Account|null,input:unknown){const v=programSchema.parse(input);if(v.status==='active')this.gate();return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,undefined,true);const [g]=await sql.query<{id:string;status:string;mentor_id:string;mentee_id:string}>(`SELECT g.*,r.mentor_id,r.mentee_id FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id WHERE g.id=$1`,[v.id]);
  if(!g||![g.mentor_id,g.mentee_id].includes(user.id))throw deny();
  if(['completed','cancelled'].includes(g.status))throw conflict();
  if(v.status==='active'){await this.eligible(sql,g.mentor_id);await this.actor(sql,{id:g.mentee_id} as Account,'mentee',true)}
  // Match profile-review lock order: eligibility first, then the program row.
  const [locked]=await sql.query<{status:string}>('SELECT status FROM mentoring_program WHERE id=$1 FOR UPDATE',[g.id]);
  if(!locked||['completed','cancelled'].includes(locked.status))throw conflict();
  await sql.query('UPDATE mentoring_program SET goal=$2,status=$3,updated_at=now() WHERE id=$1',[g.id,v.goal,v.status]);await this.audit(sql,user.id,'mentoring.program.'+v.status,g.id);return {message:'Programme mis à jour.'};
 })}
 private async suspendPrograms(sql:Sql,mentor:string){await sql.query(`UPDATE mentoring_program SET status='suspended',updated_at=now() WHERE status='active' AND request_id IN (SELECT id FROM mentoring_request WHERE mentor_id=$1)`,[mentor])}
 private async audit(sql:Sql,actor:string,action:string,id:string){await sql.query(`INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,$2,'mentoring',$3)`,[actor,action,id])}
}
