import type {Database,Sql} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {AuthError} from '../identity/errors.ts';
import {MentoringService} from '../mentoring/service.ts';
import {digestToken} from '../identity/crypto.ts';
import {questionSchema,gameSchema,reviewQuestionSchema,categorySchema,startSchema,answerSchema,catalogSchema} from './schemas.ts';
type Question={id:string;stem:string;options:string[];correct_index:number;explanation:string;source:string};
type Snapshot={aiGenerated?:boolean;title:string;category:string;expertise:string;questions:Question[]};
type Attempt={id:string;user_id:string|null;snapshot:Snapshot;cursor:number;score:number;points_per_answer:number;completed_at:string|null;started_at:string;expires_at:string};
const deny=()=>new AuthError(403,'forbidden','Cette action n’est pas autorisée.');
const conflict=()=>new AuthError(409,'conflict','La situation a changé. Recharge la page.');
const missing=()=>new AuthError(404,'not_found','Ce jeu ou cette partie n’est pas disponible.');
const available="g.status='published' AND c.active AND EXISTS(SELECT 1 FROM game_question x WHERE x.game_id=g.id) AND NOT EXISTS(SELECT 1 FROM game_question x JOIN quiz_question_version v ON v.id=x.version_id WHERE x.game_id=g.id AND v.status NOT IN ('approved','ai_ready'))";
export class PlayService {
 db:Database;
 constructor(db:Database){this.db=db}
 async actor(sql:Sql,account:Account|null,admin=false){
  const user=await new MentoringService(this.db).actor(sql,account,admin?'admin':undefined);
  if(admin||user.role==='admin')return user;
  if(user.role!=='mentor'||!user.adult_access_approved_at)throw deny();
  const [p]=await sql.query("SELECT user_id FROM mentor_profile WHERE user_id=$1 AND publication_status='published' AND verification_status='verified' FOR SHARE",[user.id]);
  if(!p)throw deny();return user;
 }
 async categories(){return this.db.query('SELECT * FROM game_category WHERE active ORDER BY name')}
 async category(account:Account|null,input:unknown){const v=categorySchema.parse(input);return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,true);
  const rows=v.id?await sql.query('UPDATE game_category SET name=$2,expertise=$3,active=$4 WHERE id=$1 RETURNING id',[v.id,v.name,v.expertise,v.active]):await sql.query('INSERT INTO game_category(name,expertise,active) VALUES($1,$2,$3) RETURNING id',[v.name,v.expertise,v.active]);
  if(!rows[0])throw missing();await this.audit(sql,user.id,'play.category.saved',rows[0].id as string);return {message:'Catégorie enregistrée.'};
 })}
 async questions(account:Account|null){return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account);
  return sql.query(`SELECT v.*,q.author_id,c.name AS category,
   (SELECT count(DISTINCT x.question_id)::integer FROM quiz_question_version x WHERE lower(btrim(x.stem))=lower(btrim(v.stem)) AND x.question_id<>v.question_id) AS possible_duplicates
   FROM quiz_question_version v JOIN quiz_question q ON q.id=v.question_id JOIN game_category c ON c.id=v.category_id
   WHERE ($2='admin' OR q.author_id=$1 OR v.status='approved') ORDER BY v.created_at DESC,v.id LIMIT 200`,[user.id,user.role]);
 })}
 async saveQuestion(account:Account|null,input:unknown){const v=questionSchema.parse(input);return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account);await this.activeCategory(sql,v.categoryId);
  let id=v.questionId;
  if(id){const [q]=await sql.query<{author_id:string}>('SELECT author_id FROM quiz_question WHERE id=$1 FOR UPDATE',[id]);if(!q||(q.author_id!==user.id&&user.role!=='admin'))throw deny()}
  else{const [q]=await sql.query<{id:string}>('INSERT INTO quiz_question(author_id) VALUES($1) RETURNING id',[user.id]);id=q.id}
  const [version]=await sql.query<{id:string}>(`INSERT INTO quiz_question_version(question_id,version,category_id,level,stem,options,correct_index,explanation,source,created_by)
    VALUES($1,(SELECT coalesce(max(version),0)+1 FROM quiz_question_version WHERE question_id=$1),$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[id,v.categoryId,v.level,v.stem,v.options,v.correctIndex,v.explanation,v.source,user.id]);
  await this.audit(sql,user.id,'play.question.drafted',version.id);return {id:version.id,message:'Nouvelle version enregistrée en brouillon.'};
 })}
 async submitQuestion(account:Account|null,id:string){return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account);const rows=await sql.query(`UPDATE quiz_question_version v SET status='submitted' FROM quiz_question q WHERE v.id=$1 AND q.id=v.question_id AND (q.author_id=$2 OR v.created_by=$2) AND v.status='draft' RETURNING v.id`,[id,user.id]);
  if(!rows.length)throw conflict();await this.audit(sql,user.id,'play.question.submitted',id);return {message:'Question soumise à l’examen humain.'};
 })}
 async reviewQuestion(account:Account|null,input:unknown){const v=reviewQuestionSchema.parse(input);return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,true);const [q]=await sql.query<{author_id:string|null;created_by:string|null;status:string}>(`SELECT v.status,v.created_by,q.author_id FROM quiz_question_version v JOIN quiz_question q ON q.id=v.question_id WHERE v.id=$1 FOR UPDATE OF v`,[v.id]);
  if(!q)throw missing();if(q.author_id===user.id||q.created_by===user.id)throw deny();
  if(v.decision==='archived'?!['approved','submitted','in_review','rejected'].includes(q.status):!['submitted','in_review'].includes(q.status))throw conflict();
  await sql.query('UPDATE quiz_question_version SET status=$2,reviewed_by=$3,review_note=$4,reviewed_at=now() WHERE id=$1',[v.id,v.decision,user.id,v.note]);
  await this.audit(sql,user.id,'play.question.'+v.decision,v.id);return {message:'Décision enregistrée.'};
 })}
 async games(account:Account|null){return this.db.transaction(async sql=>{const user=await this.actor(sql,account);return sql.query(`SELECT g.*,(SELECT count(*)::integer FROM ai_sprint_report r WHERE r.game_id=g.id) AS reports,c.name AS category,(SELECT count(*)::integer FROM game_question x WHERE x.game_id=g.id) AS question_count,(SELECT coalesce(jsonb_agg(jsonb_build_object('id',v.id,'stem',v.stem,'status',v.status) ORDER BY x.ordinal),'[]'::jsonb) FROM game_question x JOIN quiz_question_version v ON v.id=x.version_id WHERE x.game_id=g.id) AS questions FROM quiz_game g JOIN game_category c ON c.id=g.category_id WHERE g.author_id=$1 OR $2='admin' ORDER BY g.created_at DESC LIMIT 100`,[user.id,user.role])})}
 async createGame(account:Account|null,input:unknown){const v=gameSchema.parse(input);return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account);await this.activeCategory(sql,v.categoryId);
  const questions=await sql.query<{id:string;question_id:string;category_id:string;status:string}>('SELECT id,question_id,category_id,status FROM quiz_question_version WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE',[v.questionIds]);
  if(questions.length!==v.questionIds.length||new Set(questions.map(q=>q.question_id)).size!==questions.length||questions.some(q=>q.status!=='approved'||q.category_id!==v.categoryId))throw new AuthError(400,'invalid_game','Choisis uniquement des versions approuvées, distinctes et de la même catégorie.');
  const [game]=await sql.query<{id:string}>(`INSERT INTO quiz_game(author_id,title,description,category_id,level,duration_minutes,points_per_answer) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[user.id,v.title,v.description,v.categoryId,v.level,v.durationMinutes,v.pointsPerAnswer]);
  for(const [i,id] of v.questionIds.entries())await sql.query('INSERT INTO game_question(game_id,ordinal,version_id) VALUES($1,$2,$3)',[game.id,i,id]);
  await this.audit(sql,user.id,'play.game.drafted',game.id);return {id:game.id,message:'Quiz enregistré en brouillon.'};
 })}
 async submitGame(account:Account|null,id:string){return this.db.transaction(async sql=>{const user=await this.actor(sql,account);const rows=await sql.query("UPDATE quiz_game SET status='submitted' WHERE id=$1 AND author_id=$2 AND status='draft' RETURNING id",[id,user.id]);if(!rows.length)throw conflict();await this.audit(sql,user.id,'play.game.submitted',id);return {message:'Quiz soumis à validation.'}})}
 async reviewGame(account:Account|null,id:string,publish:boolean){return this.db.transaction(async sql=>{
  const user=await this.actor(sql,account,true);const [g]=await sql.query<{category_id:string;status:string}>('SELECT category_id,status FROM quiz_game WHERE id=$1 FOR UPDATE',[id]);if(!g)throw missing();
  if(publish){
   if(g.status!=='submitted')throw conflict();await this.activeCategory(sql,g.category_id);
   const q=await sql.query<{status:string;category_id:string}>(`SELECT v.status,v.category_id FROM game_question x JOIN quiz_question_version v ON v.id=x.version_id WHERE x.game_id=$1 ORDER BY x.ordinal FOR SHARE OF v`,[id]);
   if(q.length<1||q.length>30||q.some(item=>item.status!=='approved'||item.category_id!==g.category_id))throw new AuthError(400,'invalid_game','Le quiz contient une question retirée ou non approuvée.');
  }else if(!['published','submitted','draft'].includes(g.status))throw conflict();
  await sql.query("UPDATE quiz_game SET status=$2,reviewed_by=$3,published_at=CASE WHEN $4 THEN now() ELSE published_at END WHERE id=$1",[id,publish?'published':'archived',user.id,publish]);
  await this.audit(sql,user.id,publish?'play.game.published':'play.game.archived',id);return {message:publish?'Quiz publié.':'Quiz archivé.'};
 })}
 async catalog(input:unknown){const v=catalogSchema.parse(input);const values:unknown[]=['%'+v.q.replace(/[\\%_]/g,'\\$&')+'%',v.maxMinutes,v.maxQuestions];let where=available+" AND (g.title ILIKE $1 OR g.description ILIKE $1 OR c.name ILIKE $1 OR c.expertise ILIKE $1) AND g.duration_minutes<=$2 AND (SELECT count(*) FROM game_question x WHERE x.game_id=g.id)<=$3";
  if(v.category){values.push(v.category);where+=' AND g.category_id=$'+values.length}if(v.level){values.push(v.level);where+=' AND g.level=$'+values.length}
  const fields="g.id,g.title,g.description,g.generation_id IS NOT NULL AS ai_generated,g.level,g.duration_minutes,g.points_per_answer,c.name AS category,c.expertise,(SELECT count(*)::integer FROM game_question x WHERE x.game_id=g.id) AS question_count,(SELECT count(*)::integer FROM game_attempt a WHERE a.game_id=g.id AND a.completed_at IS NOT NULL) AS completions";
  return this.db.transaction(async sql=>{const [count]=await sql.query<{total:string}>(`SELECT count(*) AS total FROM quiz_game g JOIN game_category c ON c.id=g.category_id WHERE ${where}`,values);const items=await sql.query(`SELECT ${fields} FROM quiz_game g JOIN game_category c ON c.id=g.category_id WHERE ${where} ORDER BY ${v.sort==='popular'?'completions DESC,':''} g.created_at DESC,g.id LIMIT 12 OFFSET $${values.length+1}`,[...values,(v.page-1)*12]);return {items,total:Number(count.total),page:v.page,pageSize:12}});
 }
 async start(ownerToken:string,account:Account|null,input:unknown){const v=startSchema.parse(input);return this.db.transaction(async sql=>{
  if(v.saveHistory)await new MentoringService(this.db).actor(sql,account,undefined,true);
  const [g]=await sql.query<{id:string;title:string;category:string;expertise:string;points_per_answer:number;ai_generated:boolean}>(`SELECT g.generation_id IS NOT NULL AS ai_generated,g.id,g.title,c.name AS category,c.expertise,g.points_per_answer FROM quiz_game g JOIN game_category c ON c.id=g.category_id WHERE ${available} AND g.id=$1 FOR SHARE OF g,c`,[v.gameId]);if(!g)throw missing();
  const questions=await sql.query<Question&{status:string}>(`SELECT v.id,v.stem,v.options,v.correct_index,v.explanation,v.source,v.status FROM game_question x JOIN quiz_question_version v ON v.id=x.version_id WHERE x.game_id=$1 ORDER BY x.ordinal FOR SHARE OF v`,[g.id]);
  if(questions.length<1||questions.some(q=>!['approved','ai_ready'].includes(q.status)))throw conflict();
  const snapshot:Snapshot={aiGenerated:g.ai_generated,title:g.title,category:g.category,expertise:g.expertise,questions:questions.map(({status,...q})=>q)};
  const [attempt]=await sql.query<{id:string}>(`INSERT INTO game_attempt(game_id,owner_hash,user_id,snapshot,points_per_answer) VALUES($1,$2,$3,$4::jsonb,$5) RETURNING id`,[g.id,digestToken(ownerToken),v.saveHistory?account!.id:null,JSON.stringify(snapshot),g.points_per_answer]);
  return {id:attempt.id};
 })}
 private async attempt(sql:Sql,id:string,owner:string,account:Account|null,lock=false){
  const [a]=await sql.query<Attempt>(`SELECT * FROM game_attempt WHERE id=$1 AND owner_hash=$2 ${lock?'FOR UPDATE':''}`,[id,digestToken(owner)]);
  if(!a||(a.user_id&&a.user_id!==account?.id))throw missing();
  if(new Date(a.expires_at).getTime()<Date.now())throw new AuthError(410,'expired','Cette partie a expiré. Commence un nouveau quiz.');
  if(a.user_id)await new MentoringService(this.db).actor(sql,account,undefined,true);
  if(a.snapshot.aiGenerated&&!a.completed_at&&Date.now()>=new Date(a.started_at).getTime()+180_000){
   const [ended]=await sql.query<{completed_at:string}>(`UPDATE game_attempt SET completed_at=coalesce(completed_at,started_at+interval '3 minutes') WHERE id=$1 RETURNING completed_at`,[a.id]);
   a.completed_at=ended.completed_at;
  }
  return a;
 }
 async state(owner:string,account:Account|null,id:string){return this.db.transaction(async sql=>{
  const a=await this.attempt(sql,id,owner,account);const q=a.snapshot.questions[a.cursor];const completed=!!a.completed_at;
  const result:Record<string,unknown>={id:a.id,aiGenerated:a.snapshot.aiGenerated===true,deadline:a.snapshot.aiGenerated?new Date(new Date(a.started_at).getTime()+180_000).toISOString():null,title:a.snapshot.title,category:a.snapshot.category,expertise:a.snapshot.expertise,total:a.snapshot.questions.length,answered:a.cursor,score:a.score,maxScore:a.snapshot.questions.length*a.points_per_answer,pointsPerAnswer:a.points_per_answer,completed,saved:!!a.user_id,question:q&&!completed?{index:a.cursor,stem:q.stem,options:q.options}:null};
  if(completed){
   const answers=await sql.query<{ordinal:number;choice:number;correct:boolean;points:number}>('SELECT ordinal,choice,correct,points FROM game_attempt_answer WHERE attempt_id=$1 ORDER BY ordinal',[a.id]);
   result.unanswered=a.snapshot.questions.length-answers.length;result.correct=answers.filter(v=>v.correct).length;result.wrong=answers.filter(v=>!v.correct).length;result.percentage=Math.round(a.score/(a.snapshot.questions.length*a.points_per_answer)*100);
   result.results=answers.map(v=>({...v,stem:a.snapshot.questions[v.ordinal].stem,options:a.snapshot.questions[v.ordinal].options,correctIndex:a.snapshot.questions[v.ordinal].correct_index,explanation:a.snapshot.questions[v.ordinal].explanation,source:a.snapshot.questions[v.ordinal].source}));
   result.topicsToExplore=answers.some(v=>!v.correct)?[a.snapshot.category]:[];
   result.durationSeconds=Math.max(0,Math.round((new Date(a.completed_at!).getTime()-new Date(a.started_at).getTime())/1000));
  }
  return result;
 })}
 async answer(owner:string,account:Account|null,input:unknown){const v=answerSchema.parse(input);return this.db.transaction(async sql=>{
  const a=await this.attempt(sql,v.attemptId,owner,account,true);const q=a.snapshot.questions[v.index];if(!q||v.index>a.cursor)throw conflict();
  const [previous]=await sql.query<{choice:number;correct:boolean;points:number}>('SELECT choice,correct,points FROM game_attempt_answer WHERE attempt_id=$1 AND ordinal=$2',[a.id,v.index]);
  if(a.completed_at&&!previous)throw new AuthError(410,'sprint_finished','Le Sprint est terminé. Consulte ton résultat.');
  if(previous&&previous.choice!==v.choice)throw conflict();
  if(!previous){
   if(v.index!==a.cursor)throw conflict();const correct=v.choice===q.correct_index,points=correct?a.points_per_answer:0;
   await sql.query('INSERT INTO game_attempt_answer(attempt_id,ordinal,choice,correct,points) VALUES($1,$2,$3,$4,$5)',[a.id,v.index,v.choice,correct,points]);
   await sql.query('UPDATE game_attempt SET cursor=cursor+1,score=score+$2,completed_at=CASE WHEN cursor+1=$3 THEN now() ELSE NULL END WHERE id=$1',[a.id,points,a.snapshot.questions.length]);
  }
  return {index:v.index,choice:v.choice,correct:v.choice===q.correct_index,correctIndex:q.correct_index,points:previous?.points??(v.choice===q.correct_index?a.points_per_answer:0),explanation:q.explanation,source:q.source};
 })}
 async recommendations(owner:string,account:Account|null,id:string,click=false){
  const expertise=await this.db.transaction(async sql=>{const a=await this.attempt(sql,id,owner,account);if(!a.completed_at)throw conflict();if(click)await sql.query('UPDATE game_attempt SET mentor_click_at=coalesce(mentor_click_at,now()) WHERE id=$1',[id]);return a.snapshot.expertise});
  const mentors=await new MentoringService(this.db).search({expertise});return {expertise,items:mentors.items.slice(0,3),directory:'/mentors/?expertise='+encodeURIComponent(expertise)};
 }
 async history(account:Account|null){return this.db.transaction(async sql=>{const user=await new MentoringService(this.db).actor(sql,account,undefined,true);return sql.query(`SELECT id,snapshot->>'title' AS title,snapshot->>'category' AS category,score,jsonb_array_length(snapshot->'questions')*points_per_answer AS max_score,started_at,completed_at,extract(epoch FROM (completed_at-started_at))::integer AS duration_seconds FROM game_attempt WHERE user_id=$1 ORDER BY started_at DESC LIMIT 100`,[user.id])})}
 async stats(account:Account|null){return this.db.transaction(async sql=>{await this.actor(sql,account,true);
  const [summary]=await sql.query<{started:number;completed:number;average_percentage:number;mentor_clicks:number}>(`SELECT count(*)::integer AS started,count(completed_at)::integer AS completed,coalesce(round(avg(CASE WHEN completed_at IS NOT NULL THEN 100.0*score/(jsonb_array_length(snapshot->'questions')*points_per_answer) END)),0)::integer AS average_percentage,count(mentor_click_at)::integer AS mentor_clicks FROM game_attempt`);
  const categories=await sql.query(`SELECT snapshot->>'category' AS category,count(*)::integer AS attempts FROM game_attempt GROUP BY snapshot->>'category' ORDER BY attempts DESC LIMIT 12`);
  const missed=await sql.query(`SELECT a.snapshot->'questions'->r.ordinal->>'stem' AS stem,count(*)::integer AS wrong_answers FROM game_attempt_answer r JOIN game_attempt a ON a.id=r.attempt_id WHERE NOT r.correct GROUP BY a.snapshot->'questions'->r.ordinal->>'stem' ORDER BY wrong_answers DESC LIMIT 10`);
  const [games]=await sql.query<{published:number}>("SELECT count(*)::integer AS published FROM quiz_game g JOIN game_category c ON c.id=g.category_id WHERE "+available);
  const [requests]=await sql.query<{attributed:number}>('SELECT count(*)::integer AS attributed FROM mentoring_request WHERE source_attempt_id IS NOT NULL');
  return {...summary,...games,...requests,categories,missed,attributionNote:'Uniquement les demandes reliées explicitement à une partie personnelle terminée ; aucune attribution des inscriptions.'};
 })}
 private async activeCategory(sql:Sql,id:string){if(!(await sql.query('SELECT id FROM game_category WHERE id=$1 AND active FOR SHARE',[id])).length)throw new AuthError(400,'invalid_category','Catégorie inactive ou introuvable.')}
 private async audit(sql:Sql,actor:string,action:string,id:string){await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,$2,'play',$3)",[actor,action,id])}
}
