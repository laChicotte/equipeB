import type {Database,Sql} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {AuthError} from '../identity/errors.ts';
import {MentoringService} from '../mentoring/service.ts';
import {programSchema,sessionSchema,sessionActionSchema,objectiveSchema,objectiveActionSchema} from './schemas.ts';
type Program={id:string;status:string;request_status:string;mentor_id:string;mentee_id:string};
const conflict=()=>new AuthError(409,'conflict','La situation a changé. Actualisez avant de réessayer.');
const denied=()=>new AuthError(403,'forbidden','Cette action n’est pas autorisée.');
const missing=()=>new AuthError(404,'not_found','Cet élément n’est pas disponible.');
export class PlanningService {
 db:Database;enabled:boolean;writeEnabled:boolean;
 constructor(db:Database,enabled=false,writeEnabled=false){this.db=db;this.enabled=enabled;this.writeEnabled=writeEnabled}
 private gate(){if(!this.enabled)throw new AuthError(403,'planning_closed','La planification privée n’est pas encore ouverte.')}
 private async access(sql:Sql,account:Account|null,id:string,write=false){
  this.gate();const mentoring=new MentoringService(this.db),u=await mentoring.actor(sql,account,undefined,true);
  const [p]=await sql.query<Program>(`SELECT g.id,g.status,r.status AS request_status,r.mentor_id,r.mentee_id FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id WHERE g.id=$1`,[id]);
  if(!p||![p.mentor_id,p.mentee_id].includes(u.id))throw missing();
  if(u.role!==(u.id===p.mentor_id?'mentor':'mentee'))throw denied();
  if(write){
   if(!this.writeEnabled)throw new AuthError(403,'mentoring_closed','Les mises en relation ne sont pas encore ouvertes.');
   // Lock each participant in a stable order across programs, avoiding double bookings.
   for(const participant of [p.mentor_id,p.mentee_id].sort())await sql.query('SELECT pg_advisory_xact_lock(hashtext($1))',['planning:'+participant]);
   await mentoring.eligible(sql,p.mentor_id);await mentoring.actor(sql,{id:p.mentee_id} as Account,'mentee',true);
   const [live]=await sql.query<{status:string;request_status:string}>(`SELECT g.status,r.status AS request_status FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id WHERE g.id=$1 FOR SHARE OF g,r`,[id]);
   if(live?.status!=='active'||live.request_status!=='accepted')throw denied();
   const blocks=await sql.query('SELECT 1 FROM user_block WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',[p.mentor_id,p.mentee_id]);if(blocks.length)throw new AuthError(403,'blocked','Cet accompagnement est bloqué.');
  }return {u,p};
 }
 private async audit(sql:Sql,user:string,action:string,id:string){await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,$2,'planning',$3)",[user,action,id])}
 async programs(account:Account|null){this.gate();return this.db.transaction(async sql=>{const u=await new MentoringService(this.db).actor(sql,account,undefined,true);return sql.query(`SELECT g.id,g.status,g.goal,CASE WHEN $2='mentor' THEN left(g.goal,80) ELSE p.public_name END AS title FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id JOIN mentor_profile p ON p.user_id=r.mentor_id WHERE (r.mentor_id=$1 AND $2='mentor') OR (r.mentee_id=$1 AND $2='mentee') ORDER BY g.created_at DESC LIMIT 100`,[u.id,u.role])})}
 async board(account:Account|null,input:unknown){const v=programSchema.parse(input);return this.db.transaction(async sql=>{const {u,p}=await this.access(sql,account,v.programId);let canWrite=this.writeEnabled;try{await this.access(sql,account,p.id,true)}catch{canWrite=false}
  const sessions=await sql.query('SELECT id,title,starts_at,ends_at,status,proposed_by,revision FROM mentoring_session WHERE program_id=$1 ORDER BY starts_at DESC LIMIT 100',[p.id]);
  const objectives=await sql.query(`SELECT id,title,to_char(due_date,'YYYY-MM-DD') AS due_date,status,revision FROM mentoring_objective WHERE program_id=$1 ORDER BY created_at DESC LIMIT 100`,[p.id]);return {programId:p.id,accountId:u.id,role:u.role,canWrite,sessions,objectives};})}
 private async free(sql:Sql,p:Program,start:string,end:string,except:string){const rows=await sql.query(`SELECT s.id FROM mentoring_session s JOIN mentoring_program g ON g.id=s.program_id JOIN mentoring_request r ON r.id=g.request_id WHERE s.status='confirmed' AND s.id<>$5::uuid AND s.starts_at<$4::timestamptz AND s.ends_at>$3::timestamptz AND (r.mentor_id IN ($1::uuid,$2::uuid) OR r.mentee_id IN ($1::uuid,$2::uuid)) LIMIT 1`,[p.mentor_id,p.mentee_id,start,end,except]);if(rows.length)throw new AuthError(409,'time_conflict','Un participant a déjà une séance confirmée sur ce créneau.')}
 async propose(account:Account|null,input:unknown){const v=sessionSchema.parse(input);const time=Date.parse(v.startsAt);if(time<=Date.now()||time>Date.now()+366*86400000)throw new AuthError(400,'invalid_time','Choisissez un créneau futur dans les douze prochains mois.');return this.db.transaction(async sql=>{
  const {u,p}=await this.access(sql,account,v.programId,true),end=new Date(time+v.durationMinutes*60000).toISOString();
  const [old]=await sql.query<{id:string;program_id:string;title:string;starts_at:string;ends_at:string}>('SELECT * FROM mentoring_session WHERE proposed_by=$1 AND client_id=$2',[u.id,v.clientId]);
  if(old){if(old.program_id!==p.id||old.title!==v.title||new Date(old.starts_at).getTime()!==time||new Date(old.ends_at).getTime()!==Date.parse(end))throw conflict();return {id:old.id,message:'Proposition déjà enregistrée.'}}
  await this.free(sql,p,v.startsAt,end,'00000000-0000-0000-0000-000000000000');
  const [s]=await sql.query<{id:string}>('INSERT INTO mentoring_session(program_id,proposed_by,client_id,title,starts_at,ends_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[p.id,u.id,v.clientId,v.title,v.startsAt,end]);await this.audit(sql,u.id,'session.proposed',s.id);return {id:s.id,message:'Créneau proposé. Votre partenaire doit le confirmer.'};})}
 async sessionAction(account:Account|null,input:unknown){const v=sessionActionSchema.parse(input);return this.db.transaction(async sql=>{const {u,p}=await this.access(sql,account,v.programId,v.action!=='cancel');
  // Cancellation remains available to an authorised participant after suspension/blocking.
  if(v.action==='cancel')for(const participant of [p.mentor_id,p.mentee_id].sort())await sql.query('SELECT pg_advisory_xact_lock(hashtext($1))',['planning:'+participant]);
  const [s]=await sql.query<{id:string;status:string;proposed_by:string;starts_at:string;ends_at:string;revision:number}>('SELECT * FROM mentoring_session WHERE id=$1 AND program_id=$2 FOR UPDATE',[v.id,p.id]);if(!s)throw missing();if(s.revision!==v.revision)throw conflict();
  if(v.action==='confirm'){if(s.status!=='proposed'||s.proposed_by===u.id)throw conflict();if(new Date(s.starts_at).getTime()<=Date.now())throw conflict();await this.free(sql,p,new Date(s.starts_at).toISOString(),new Date(s.ends_at).toISOString(),s.id)}
  if(v.action==='cancel'&&!['proposed','confirmed'].includes(s.status))throw conflict();
  if(v.action==='complete'&&(u.id!==p.mentor_id||s.status!=='confirmed'||new Date(s.ends_at).getTime()>Date.now()))throw denied();
  const status=v.action==='confirm'?'confirmed':v.action==='cancel'?'cancelled':'completed';await sql.query('UPDATE mentoring_session SET status=$2,revision=revision+1,updated_at=now() WHERE id=$1',[s.id,status]);await this.audit(sql,u.id,'session.'+status,s.id);return {message:'Séance mise à jour.'};})}
 async objective(account:Account|null,input:unknown){const v=objectiveSchema.parse(input);return this.db.transaction(async sql=>{const {u,p}=await this.access(sql,account,v.programId,true);const [old]=await sql.query<{id:string;program_id:string;title:string;due_date:string|null}>(`SELECT id,program_id,title,to_char(due_date,'YYYY-MM-DD') AS due_date FROM mentoring_objective WHERE created_by=$1 AND client_id=$2`,[u.id,v.clientId]);if(old){if(old.program_id!==p.id||old.title!==v.title||old.due_date!==v.dueDate)throw conflict();return {id:old.id,message:'Objectif déjà enregistré.'}}
 const [o]=await sql.query<{id:string}>('INSERT INTO mentoring_objective(program_id,created_by,client_id,title,due_date) VALUES($1,$2,$3,$4,$5) RETURNING id',[p.id,u.id,v.clientId,v.title,v.dueDate]);await this.audit(sql,u.id,'objective.created',o.id);return {id:o.id,message:'Objectif partagé ajouté.'};})}
 async objectiveAction(account:Account|null,input:unknown){const v=objectiveActionSchema.parse(input);return this.db.transaction(async sql=>{const {u,p}=await this.access(sql,account,v.programId,true);const rows=await sql.query('UPDATE mentoring_objective SET status=$3,revision=revision+1,updated_at=now() WHERE id=$1 AND program_id=$2 AND revision=$4 RETURNING id',[v.id,p.id,v.status,v.revision]);if(!rows.length)throw conflict();await this.audit(sql,u.id,'objective.'+v.status,v.id);return {message:'Progression mise à jour.'};})}
}
