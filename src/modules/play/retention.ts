import type {Database} from '../../server/database.ts';
// Explicit maintenance job, not invoked from public requests or startup.
export async function purgeExpiredGuestAttempts(db:Database){
 return db.transaction(async sql=>{
  const rows=await sql.query<{id:string}>(`DELETE FROM game_attempt a WHERE a.user_id IS NULL AND a.expires_at<now()
   AND NOT EXISTS(SELECT 1 FROM mentoring_request r WHERE r.source_attempt_id=a.id) RETURNING a.id`);
  return rows.length;
 });
}
