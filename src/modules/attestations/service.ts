import {z} from 'zod';
import type {Database,Sql} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {MentoringService} from '../mentoring/service.ts';
import {AuthError} from '../identity/errors.ts';
export const issueSchema=z.strictObject({programId:z.string().uuid()});
export const detailSchema=z.strictObject({id:z.string().uuid()});
export const revokeSchema=z.strictObject({id:z.string().uuid(),revision:z.number().int().positive(),reason:z.string().trim().min(10).max(500)});
const missing=()=>new AuthError(404,'not_found','Cette attestation n’est pas disponible.');
const conflict=()=>new AuthError(409,'conflict','La situation a changé. Actualisez avant de réessayer.');
const columns='a.id,a.program_id,a.recipient_id,a.mentor_name,a.program_started_at,a.program_completed_at,a.completed_sessions,a.issued_at,a.revoked_at,a.revocation_reason,a.revision';
export class AttestationService {
 db:Database;enabled:boolean;
 constructor(db:Database,enabled=false){this.db=db;this.enabled=enabled}
 private async actor(sql:Sql,account:Account|null){const u=await new MentoringService(this.db).actor(sql,account);if(u.role!=='admin'&&!u.adult_access_approved_at)throw new AuthError(403,'forbidden','Cette action n’est pas autorisée.');return u}
 private async audit(sql:Sql,user:string,action:string,id:string){await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,$2,'attestation',$3)",[user,action,id])}
 async own(account:Account|null){return this.db.transaction(async sql=>{const u=await this.actor(sql,account);return sql.query(`SELECT ${columns} FROM participation_attestation a WHERE a.recipient_id=$1 ORDER BY a.issued_at DESC LIMIT 100`,[u.id])})}
 async detail(account:Account|null,input:unknown){const v=detailSchema.parse(input);return this.db.transaction(async sql=>{const u=await this.actor(sql,account);const [a]=await sql.query(`SELECT ${columns} FROM participation_attestation a WHERE a.id=$1 AND (a.recipient_id=$2 OR $3='admin')`,[v.id,u.id,u.role]);if(!a)throw missing();return a})}
 async candidates(account:Account|null){return this.db.transaction(async sql=>{await new MentoringService(this.db).actor(sql,account,'admin');return sql.query(`SELECT g.id AS program_id,g.created_at AS started_at,g.updated_at AS completed_at,p.public_name AS mentor_name,a.id AS attestation_id,a.revoked_at,(SELECT count(*)::integer FROM mentoring_session s WHERE s.program_id=g.id AND s.status='completed' AND s.ends_at<=now()) AS completed_sessions FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id JOIN mentor_profile p ON p.user_id=r.mentor_id LEFT JOIN participation_attestation a ON a.program_id=g.id WHERE g.status='completed' ORDER BY g.updated_at DESC LIMIT 100`)})}
 async issue(account:Account|null,input:unknown){const v=issueSchema.parse(input);if(!this.enabled)throw new AuthError(403,'attestations_closed','La délivrance des attestations n’est pas encore ouverte.');return this.db.transaction(async sql=>{
  const mentoring=new MentoringService(this.db),u=await mentoring.actor(sql,account,'admin');
  const [p]=await sql.query<{mentor_id:string;mentee_id:string}>(`SELECT r.mentor_id,r.mentee_id FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id WHERE g.id=$1`,[v.programId]);if(!p)throw missing();if([p.mentor_id,p.mentee_id].includes(u.id))throw new AuthError(403,'self_issue','Un participant ne peut pas délivrer sa propre attestation.');
  await mentoring.eligible(sql,p.mentor_id);await mentoring.actor(sql,{id:p.mentee_id} as Account,'mentee',true);
  const [g]=await sql.query<{status:string;request_status:string;created_at:string;updated_at:string;public_name:string}>(`SELECT g.status,r.status AS request_status,g.created_at,g.updated_at,p.public_name FROM mentoring_program g JOIN mentoring_request r ON r.id=g.request_id JOIN mentor_profile p ON p.user_id=r.mentor_id WHERE g.id=$1 FOR UPDATE OF g`,[v.programId]);
  if(!g||g.status!=='completed'||g.request_status!=='accepted')throw conflict();
  const [old]=await sql.query<{id:string;revoked_at:unknown}>('SELECT id,revoked_at FROM participation_attestation WHERE program_id=$1',[v.programId]);if(old){if(old.revoked_at)throw new AuthError(409,'revoked','Cette attestation a été révoquée. Aucune réémission automatique.');return {id:old.id,message:'Attestation déjà délivrée.'}}
  const [sessions]=await sql.query<{count:number}>("SELECT count(*)::integer AS count FROM mentoring_session WHERE program_id=$1 AND status='completed' AND ends_at<=now()",[v.programId]);if(!sessions.count)throw new AuthError(409,'no_completed_session','Une séance terminée est requise avant délivrance.');
  const [a]=await sql.query<{id:string}>('INSERT INTO participation_attestation(program_id,recipient_id,mentor_name,program_started_at,program_completed_at,completed_sessions,issued_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[v.programId,p.mentee_id,g.public_name,g.created_at,g.updated_at,sessions.count,u.id]);await this.audit(sql,u.id,'attestation.issued',a.id);return {id:a.id,message:'Attestation de participation délivrée.'};
 })}
 async revoke(account:Account|null,input:unknown){const v=revokeSchema.parse(input);return this.db.transaction(async sql=>{const u=await new MentoringService(this.db).actor(sql,account,'admin');const [a]=await sql.query<{revision:number;revoked_at:unknown}>('SELECT revision,revoked_at FROM participation_attestation WHERE id=$1 FOR UPDATE',[v.id]);if(!a)throw missing();if(a.revision!==v.revision||a.revoked_at)throw conflict();await sql.query('UPDATE participation_attestation SET revoked_by=$2,revoked_at=now(),revocation_reason=$3,revision=revision+1 WHERE id=$1',[v.id,u.id,v.reason]);await this.audit(sql,u.id,'attestation.revoked',v.id);return {message:'Attestation révoquée. Son statut reste consultable.'};})}
}
