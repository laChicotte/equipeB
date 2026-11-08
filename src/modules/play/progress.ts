import type {Account} from '../identity/access.ts';
import type {Database} from '../../server/database.ts';
import {MentoringService} from '../mentoring/service.ts';
import {progressBadges} from './achievements.ts';
type Summary={started:number;completed:number;fullyAnswered:number;distinctGames:number;distinctCategories:number;successfulGames:number;bestPercentage:number;averagePercentage:number};
export class PlayProgressService{
 db:Database;
 constructor(db:Database){this.db=db}
 async progress(account:Account|null){return this.db.transaction(async sql=>{
  const user=await new MentoringService(this.db).actor(sql,account,undefined,true);
  const maximum="jsonb_array_length(a.snapshot->'questions')*a.points_per_answer";
  const complete="a.completed_at IS NOT NULL AND a.cursor=jsonb_array_length(a.snapshot->'questions') AND a.cursor>0";
  const [summary]=await sql.query<Summary>(`SELECT count(*)::integer AS started,count(a.completed_at)::integer AS completed,
   count(*) FILTER(WHERE ${complete})::integer AS "fullyAnswered",
   count(DISTINCT a.game_id) FILTER(WHERE ${complete})::integer AS "distinctGames",
   count(DISTINCT g.category_id) FILTER(WHERE ${complete})::integer AS "distinctCategories",
   count(DISTINCT a.game_id) FILTER(WHERE ${complete} AND a.score*5>=(${maximum})*4)::integer AS "successfulGames",
   coalesce(round(max(100.0*a.score/nullif(${maximum},0)) FILTER(WHERE a.completed_at IS NOT NULL)),0)::integer AS "bestPercentage",
   coalesce(round(avg(100.0*a.score/nullif(${maximum},0)) FILTER(WHERE a.completed_at IS NOT NULL)),0)::integer AS "averagePercentage"
   FROM game_attempt a JOIN quiz_game g ON g.id=a.game_id WHERE a.user_id=$1`,[user.id]);
  const categories=await sql.query<{id:string;name:string;completed:number;bestPercentage:number;averagePercentage:number}>(`SELECT c.id,c.name,count(*)::integer AS completed,
   coalesce(round(max(100.0*a.score/nullif(${maximum},0))),0)::integer AS "bestPercentage",
   coalesce(round(avg(100.0*a.score/nullif(${maximum},0))),0)::integer AS "averagePercentage"
   FROM game_attempt a JOIN quiz_game g ON g.id=a.game_id JOIN game_category c ON c.id=g.category_id
   WHERE a.user_id=$1 AND a.completed_at IS NOT NULL GROUP BY c.id ORDER BY max(a.completed_at) DESC,c.id LIMIT 100`,[user.id]);
  return {summary,badges:progressBadges(summary),categories,scope:'saved-history',rulesVersion:'2026-11-08-play-v1'};
 })}
}
