import type {Database} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {PlayService} from './service.ts';

export class ContributionProgressService {
 db:Database;
 constructor(db:Database){this.db=db}
 async progress(account:Account|null){return this.db.transaction(async sql=>{
  const user=await new PlayService(this.db).actor(sql,account);
  // One latest version per authored question, including a replacement draft.
  const questions=await sql.query<{status:string;count:number}>(`SELECT v.status,count(*)::integer AS count FROM quiz_question q
   JOIN LATERAL (SELECT status,generation_id FROM quiz_question_version WHERE question_id=q.id ORDER BY version DESC LIMIT 1) v ON true
   WHERE q.author_id=$1 AND v.generation_id IS NULL GROUP BY v.status`,[user.id]);
  const games=await sql.query<{status:string;count:number}>(`SELECT status,count(*)::integer AS count FROM quiz_game WHERE author_id=$1 AND generation_id IS NULL GROUP BY status`,[user.id]);
  const [usage]=await sql.query<{completedAttempts:number}>(`SELECT count(*)::integer AS "completedAttempts" FROM game_attempt a JOIN quiz_game g ON g.id=a.game_id
   WHERE g.author_id=$1 AND g.generation_id IS NULL AND a.completed_at IS NOT NULL AND a.cursor=jsonb_array_length(a.snapshot->'questions') AND a.cursor>0`,[user.id]);
  const [publication]=await sql.query<{playableGames:number}>(`SELECT count(*)::integer AS "playableGames" FROM quiz_game g JOIN game_category c ON c.id=g.category_id
   WHERE g.author_id=$1 AND g.generation_id IS NULL AND g.status='published' AND c.active AND EXISTS(SELECT 1 FROM game_question x WHERE x.game_id=g.id)
   AND NOT EXISTS(SELECT 1 FROM game_question x JOIN quiz_question_version v ON v.id=x.version_id WHERE x.game_id=g.id AND v.status NOT IN ('approved','ai_ready'))`,[user.id]);
  const counts=(rows:{status:string;count:number}[],statuses:string[])=>Object.fromEntries(statuses.map(status=>[status,rows.find(row=>row.status===status)?.count||0]));
  return {questions:counts(questions,['draft','submitted','in_review','approved','rejected','archived']),games:counts(games,['draft','submitted','published','archived']),...publication,...usage};
 })}
}
