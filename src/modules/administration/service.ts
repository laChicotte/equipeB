import {z} from 'zod';
import type {Database} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {MentoringService} from '../mentoring/service.ts';
const resources=['user','mentoring','play','messaging','planning'] as const;
export const auditSchema=z.strictObject({resource:z.enum(resources).optional(),before:z.iso.datetime({offset:true}).optional(),beforeId:z.string().uuid().optional()}).refine(v=>Boolean(v.before)===Boolean(v.beforeId));
export class AdministrationService {
 db:Database;
 constructor(db:Database){this.db=db}
 async overview(account:Account|null){return this.db.transaction(async sql=>{
  await new MentoringService(this.db).actor(sql,account,'admin');
  // Only aggregate counts; no private conversation, message, goal or contact data.
  const [counts]=await sql.query<Record<string,number>>(`SELECT
   (SELECT count(*)::integer FROM app_user WHERE disabled_at IS NULL) AS active_accounts,
   (SELECT count(*)::integer FROM app_user WHERE disabled_at IS NULL AND email_verified_at IS NOT NULL) AS verified_accounts,
   (SELECT count(*)::integer FROM mentor_profile WHERE publication_status='submitted') AS mentors_pending,
   (SELECT count(*)::integer FROM mentor_profile p JOIN app_user u ON u.id=p.user_id WHERE p.publication_status='published' AND p.verification_status='verified' AND u.disabled_at IS NULL AND u.role='mentor' AND u.email_verified_at IS NOT NULL AND u.adult_access_approved_at IS NOT NULL) AS mentors_published,
   (SELECT count(*)::integer FROM quiz_question_version WHERE status IN ('submitted','in_review')) AS questions_pending,
   (SELECT count(*)::integer FROM quiz_game WHERE status='submitted') AS games_pending,
   (SELECT count(*)::integer FROM mentoring_request WHERE status='pending') AS requests_pending,
   (SELECT count(*)::integer FROM mentoring_program WHERE status='active') AS programs_active,
   (SELECT count(*)::integer FROM message_report WHERE status='pending') AS reports_pending,
   (SELECT count(*)::integer FROM mentoring_session WHERE status='confirmed' AND ends_at>now()) AS sessions_upcoming,
   (SELECT count(*)::integer FROM mentoring_objective WHERE status='done') AS objectives_done`);
  return {counts,observedAt:new Date().toISOString()};
 })}
 async audit(account:Account|null,input:unknown){const v=auditSchema.parse(input);return this.db.transaction(async sql=>{
  await new MentoringService(this.db).actor(sql,account,'admin');
  // Timestamp + UUID cursor preserves ties. Serialize with database precision, not JS milliseconds.
  const rows=await sql.query<{id:string;actor_id:string|null;action:string;resource_type:string;resource_id:string|null;created_at:string}>(`SELECT id,actor_id,action,resource_type,resource_id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at FROM audit_event WHERE ($1::text IS NULL OR resource_type=$1) AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT 51`,[v.resource||null,v.before||null,v.beforeId||null]);
  const items=rows.slice(0,50),last=items.at(-1);return {items,next:rows.length>50&&last?{before:last.created_at,beforeId:last.id}:null};
 })}
}
