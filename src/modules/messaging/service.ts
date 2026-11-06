import type {Database,Sql} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {AuthError} from '../identity/errors.ts';
import {MentoringService} from '../mentoring/service.ts';
import {sendSchema,pageSchema,readSchema,blockSchema,reportSchema,moderationSchema} from './schemas.ts';
type User={id:string;role:string};
type Program={id:string;status:string;request_status:string;mentor_id:string;mentee_id:string;public_name:string};
const denied=()=>new AuthError(403,'forbidden','Cette action n’est pas autorisée.');
const missing=()=>new AuthError(404,'not_found','Cet accompagnement ou message n’est pas disponible.');
export class MessagingService {
 db:Database;enabled:boolean;sendEnabled:boolean;
 constructor(db:Database,enabled=false,sendEnabled=false){this.db=db;this.enabled=enabled;this.sendEnabled=sendEnabled}
 private gate(){if(!this.enabled)throw new AuthError(403,'messaging_closed','Les échanges privés ne sont pas encore ouverts.')}
 private async actor(sql:Sql,account:Account|null){return new MentoringService(this.db).actor(sql,account,undefined,true)}
 private async program(sql:Sql,user:User,id:string){
  const [p]=await sql.query<Program>(`SELECT g.id,g.status,r.status AS request_status,r.mentor_id,r.mentee_id,p.public_name
   FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id JOIN mentor_profile p ON p.user_id=r.mentor_id WHERE g.id=$1`,[id]);
  if(!p||![p.mentor_id,p.mentee_id].includes(user.id))throw missing();
  if((p.mentor_id===user.id&&user.role!=='mentor')||(p.mentee_id===user.id&&user.role!=='mentee'))throw denied();return p;
 }
 private async pairLock(sql:Sql,p:Program){const ids=[p.mentor_id,p.mentee_id].sort();await sql.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',ids)}
 private async blocks(sql:Sql,p:Program,user:User){
  const rows=await sql.query<{blocker_id:string}>(`SELECT blocker_id FROM user_block WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)`,[p.mentor_id,p.mentee_id]);
  return {blocked:rows.length>0,blockedByMe:rows.some(r=>r.blocker_id===user.id)};
 }
 private async canSend(sql:Sql,p:Program){
  if(!this.sendEnabled)throw new AuthError(403,'mentoring_closed','Les mises en relation ne sont pas encore ouvertes.');
  await new MentoringService(this.db).eligible(sql,p.mentor_id);
  await new MentoringService(this.db).actor(sql,{id:p.mentee_id} as Account,'mentee',true);
  const [live]=await sql.query<{status:string;request_status:string}>(`SELECT g.status,r.status AS request_status FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id WHERE g.id=$1 FOR SHARE OF g,r`,[p.id]);
  if(!live||live.status!=='active'||live.request_status!=='accepted')throw new AuthError(403,'program_inactive','Cet accompagnement ne permet plus l’envoi de messages.');
 }
 async conversations(account:Account|null){this.gate();return this.db.transaction(async sql=>{
  const u=await this.actor(sql,account);
  return sql.query(`SELECT g.id AS program_id,g.status,CASE WHEN $2='mentor' THEN left(g.goal,80) ELSE p.public_name END AS public_name,c.id AS conversation_id,
   (SELECT count(*)::integer FROM private_message m WHERE m.conversation_id=c.id AND m.sender_id<>$1 AND m.seq>coalesce(cr.last_seq,0)) AS unread
   FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id JOIN mentor_profile p ON p.user_id=r.mentor_id
   LEFT JOIN message_conversation c ON c.program_id=g.id LEFT JOIN conversation_read cr ON cr.conversation_id=c.id AND cr.user_id=$1
   WHERE (r.mentor_id=$1 AND $2='mentor') OR (r.mentee_id=$1 AND $2='mentee') ORDER BY g.created_at DESC LIMIT 100`,[u.id,u.role]);
 })}
 async messages(account:Account|null,input:unknown){this.gate();const v=pageSchema.parse(input);return this.db.transaction(async sql=>{
  const u=await this.actor(sql,account),p=await this.program(sql,u,v.programId);const [c]=await sql.query<{id:string}>('SELECT id FROM message_conversation WHERE program_id=$1',[p.id]);
  const rows=c?await sql.query<{id:string;seq:string;sender_id:string;body:string;created_at:string;hidden:boolean}>(`SELECT id,seq,sender_id,CASE WHEN hidden_at IS NULL THEN body ELSE '' END AS body,created_at,hidden_at IS NOT NULL AS hidden
   FROM private_message WHERE conversation_id=$1 AND seq<coalesce($2::bigint,9223372036854775807) ORDER BY seq DESC LIMIT 41`,[c.id,v.before||null]):[];
  const block=await this.blocks(sql,p,u);let maySend=this.sendEnabled&&p.status==='active'&&p.request_status==='accepted'&&!block.blocked;
  if(maySend){try{await this.canSend(sql,p)}catch{maySend=false}}
  return {programId:p.id,title:u.role==='mentor'?'Accompagnement d’un mentoré':p.public_name,accountId:u.id,...block,canSend:maySend,hasMore:rows.length>40,items:rows.slice(0,40).reverse().map(m=>({...m,seq:String(m.seq)}))};
 })}
 async send(account:Account|null,input:unknown){this.gate();const v=sendSchema.parse(input);return this.db.transaction(async sql=>{
  const u=await this.actor(sql,account),p=await this.program(sql,u,v.programId);await this.canSend(sql,p);await this.pairLock(sql,p);
  if((await this.blocks(sql,p,u)).blocked)throw new AuthError(403,'blocked','Cette conversation est bloquée. Aucun message ne peut être envoyé.');
  const [c]=await sql.query<{id:string}>('INSERT INTO message_conversation(program_id) VALUES($1) ON CONFLICT(program_id) DO UPDATE SET program_id=excluded.program_id RETURNING id',[p.id]);
  // The upsert holds the conversation lock; sequence allocation is serialized within it.
  const [previous]=await sql.query<{id:string;seq:string;body:string}>('SELECT id,seq,body FROM private_message WHERE conversation_id=$1 AND sender_id=$2 AND client_id=$3',[c.id,u.id,v.clientId]);
  if(previous){if(previous.body!==v.body)throw new AuthError(409,'conflict','Ce message a déjà été envoyé avec un autre contenu.');return {id:previous.id,seq:String(previous.seq),message:'Message déjà envoyé.'}}
  const [m]=await sql.query<{id:string;seq:string}>('INSERT INTO private_message(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4) RETURNING id,seq',[c.id,u.id,v.clientId,v.body]);
  await this.audit(sql,u.id,'message.sent',m.id);return {id:m.id,seq:String(m.seq),message:'Message envoyé.'};
 })}
 async read(account:Account|null,input:unknown){this.gate();const v=readSchema.parse(input);return this.db.transaction(async sql=>{
  const u=await this.actor(sql,account),p=await this.program(sql,u,v.programId);
  const [m]=await sql.query<{conversation_id:string;seq:string}>(`SELECT m.conversation_id,m.seq FROM private_message m JOIN message_conversation c ON c.id=m.conversation_id WHERE m.id=$1 AND c.program_id=$2`,[v.messageId,p.id]);if(!m)throw missing();
  await sql.query('INSERT INTO conversation_read(conversation_id,user_id,last_seq) VALUES($1,$2,$3) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_seq=greatest(conversation_read.last_seq,excluded.last_seq)',[m.conversation_id,u.id,m.seq]);return {message:'Messages marqués comme lus.'};
 })}
 async block(account:Account|null,input:unknown){const v=blockSchema.parse(input);return this.db.transaction(async sql=>{
  const u=await this.actor(sql,account),p=await this.program(sql,u,v.programId);await this.pairLock(sql,p);const partner=p.mentor_id===u.id?p.mentee_id:p.mentor_id;
  if(v.blocked)await sql.query('INSERT INTO user_block(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[u.id,partner]);
  else await sql.query('DELETE FROM user_block WHERE blocker_id=$1 AND blocked_id=$2',[u.id,partner]);
  await this.audit(sql,u.id,v.blocked?'message.partner.blocked':'message.partner.unblocked',p.id);return {message:v.blocked?'Participant bloqué. L’envoi est interrompu dans les deux sens.':'Ton blocage a été retiré.'};
 })}
 async report(account:Account|null,input:unknown){const v=reportSchema.parse(input);return this.db.transaction(async sql=>{
  const u=await this.actor(sql,account),p=await this.program(sql,u,v.programId);
  const [m]=await sql.query<{id:string;body:string;sender_id:string}>(`SELECT m.id,m.body,m.sender_id FROM private_message m JOIN message_conversation c ON c.id=m.conversation_id WHERE m.id=$1 AND c.program_id=$2`,[v.messageId,p.id]);
  if(!m)throw missing();if(m.sender_id===u.id)throw denied();
  const rows=await sql.query<{id:string}>('INSERT INTO message_report(message_id,reporter_id,reason,details,evidence) VALUES($1,$2,$3,$4,$5) ON CONFLICT(message_id,reporter_id) DO NOTHING RETURNING id',[m.id,u.id,v.reason,v.details,m.body]);
  if(rows[0])await this.audit(sql,u.id,'message.reported',rows[0].id);return {message:'Signalement enregistré. L’équipe examinera le message concerné.'};
 })}
 private async moderator(sql:Sql,account:Account|null){
  if(!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
  const [u]=await sql.query<User>("SELECT id,role FROM app_user WHERE id=$1 AND disabled_at IS NULL AND email_verified_at IS NOT NULL AND role IN ('admin','moderator') FOR SHARE",[account.id]);if(!u)throw denied();return u;
 }
 async reports(account:Account|null){return this.db.transaction(async sql=>{const u=await this.moderator(sql,account);return sql.query(`SELECT r.id,r.message_id,r.reason,r.details,r.evidence,r.created_at FROM message_report r JOIN private_message m ON m.id=r.message_id WHERE r.status='pending' AND r.reporter_id<>$1 AND m.sender_id<>$1 ORDER BY r.created_at LIMIT 100`,[u.id])})}
 async moderate(account:Account|null,input:unknown){const v=moderationSchema.parse(input);return this.db.transaction(async sql=>{
  const u=await this.moderator(sql,account);const [r]=await sql.query<{message_id:string;reporter_id:string;sender_id:string;status:string}>(`SELECT r.message_id,r.reporter_id,r.status,m.sender_id FROM message_report r JOIN private_message m ON m.id=r.message_id WHERE r.id=$1 FOR UPDATE OF r`,[v.id]);
  if(!r)throw missing();if(r.reporter_id===u.id||r.sender_id===u.id)throw denied();if(r.status!=='pending')throw new AuthError(409,'conflict','Ce signalement a déjà été traité.');
  if(v.action==='hide')await sql.query('UPDATE private_message SET hidden_at=coalesce(hidden_at,now()),hidden_by=coalesce(hidden_by,$2) WHERE id=$1',[r.message_id,u.id]);
  await sql.query('UPDATE message_report SET status=$2,reviewed_by=$3,reviewed_at=now(),review_note=$4 WHERE id=$1',[v.id,v.action==='hide'?'resolved':'dismissed',u.id,v.note]);
  await this.audit(sql,u.id,'message.report.'+v.action,v.id);return {message:'Décision enregistrée.'};
 })}
 private async audit(sql:Sql,user:string,action:string,id:string){await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,$2,'messaging',$3)",[user,action,id])}
}
