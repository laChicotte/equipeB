import {createHash,timingSafeEqual} from 'node:crypto';
import type {Database} from './database.ts';
import {getDatabase} from './database.ts';
export async function maintainExpiredData(db:Database){return db.transaction(async sql=>{
 const [lock]=await sql.query<{locked:boolean}>('SELECT pg_try_advisory_xact_lock(17382910) AS locked');if(!lock.locked)return {skipped:true};
 const sessions=await sql.query(`DELETE FROM auth_session WHERE id IN (SELECT id FROM auth_session WHERE expires_at<now()-interval '1 day' OR revoked_at<now()-interval '7 days' LIMIT 1000 FOR UPDATE SKIP LOCKED) RETURNING id`);
 const tokens=await sql.query(`DELETE FROM email_token WHERE id IN (SELECT id FROM email_token WHERE expires_at<now()-interval '1 day' OR consumed_at<now()-interval '1 day' LIMIT 1000 FOR UPDATE SKIP LOCKED) RETURNING id`);
 const counters=await sql.query(`DELETE FROM auth_rate_limit WHERE bucket IN (SELECT bucket FROM auth_rate_limit WHERE expires_at<now()-interval '1 day' LIMIT 1000 FOR UPDATE SKIP LOCKED) RETURNING bucket`);
 const guests=await sql.query(`DELETE FROM game_attempt WHERE id IN (SELECT a.id FROM game_attempt a WHERE a.user_id IS NULL AND a.expires_at<now() AND NOT EXISTS(SELECT 1 FROM mentoring_request r WHERE r.source_attempt_id=a.id) LIMIT 1000 FOR UPDATE OF a SKIP LOCKED) RETURNING id`);
 return {skipped:false,sessions:sessions.length,tokens:tokens.length,counters:counters.length,guestAttempts:guests.length};
})}
type Dependencies={env:Record<string,string|undefined>;db:()=>Promise<Database>};
export async function handleMaintenance(request:Request,deps:Dependencies={env:process.env,db:getDatabase}){
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='GET')return json({message:'Méthode non autorisée.'},405);
 const secret=deps.env.CRON_SECRET;if(deps.env.MAINTENANCE_ENABLED!=='true'||!secret||secret.length<32)return json({message:'Maintenance indisponible.'},503);
 const supplied=request.headers.get('authorization')||'';if(supplied.length>4096||!supplied.startsWith('Bearer ')||!timingSafeEqual(createHash('sha256').update(supplied.slice(7)).digest(),createHash('sha256').update(secret).digest()))return json({message:'Non autorisé.'},401);
 try{return json(await maintainExpiredData(await deps.db()))}catch{console.error('talentlink_maintenance_failed');return json({message:'Maintenance temporairement indisponible.'},503)}
}
