import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {MentoringService} from '../mentoring/service.ts';
import {AuthError} from '../identity/errors.ts';
import {level,questionSchema} from './schemas.ts';

const personal=/(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){7,})/i;
export const sprintInput=z.object({requestKey:z.uuid(),categoryId:z.uuid(),level,topic:z.string().trim().min(3).max(160).refine(v=>!personal.test(v),'Sujet sans coordonnées'),publishAccepted:z.literal(true)}).strict();
const generatedQuestion=questionSchema.omit({questionId:true,categoryId:true,level:true,source:true});
export const sprintOutput=z.object({safeForPublic:z.boolean(),title:z.string().trim().min(3).max(100),description:z.string().trim().min(20).max(500),questions:z.array(generatedQuestion).length(5)}).strict();
export type SprintInput=z.infer<typeof sprintInput>;
export type SprintOutput=z.infer<typeof sprintOutput>;
export type SprintGenerator=(input:{topic:string;category:string;level:string})=>Promise<SprintOutput>;
const unavailable=()=>new AuthError(503,'sprint_unavailable','La génération IA est momentanément indisponible. Réessaie plus tard.');

export function validateSprint(raw:unknown){
 const value=sprintOutput.parse(raw);
 const all=[value.title,value.description,...value.questions.flatMap(q=>[q.stem,q.explanation,...q.options])];
 if(!value.safeForPublic||all.some(s=>personal.test(s))||new Set(value.questions.map(q=>q.stem.toLocaleLowerCase())).size!==5)
  throw new AuthError(422,'unsafe_sprint','Ce sujet ne permet pas de publier un quiz fiable et adapté. Choisis un sujet général, sans donnée personnelle.');
 return value;
}

export class SprintService {
 private db:Database;private generate:SprintGenerator;private model:string;
 constructor(db:Database,generate:SprintGenerator,model:string){this.db=db;this.generate=generate;this.model=model}
 async create(account:Account|null,input:unknown){
  const v=sprintInput.parse(input),hash=createHash('sha256').update(JSON.stringify([v.categoryId,v.level,v.topic])).digest('hex');
  const reservation=await this.db.transaction(async sql=>{
   const user=await new MentoringService(this.db).actor(sql,account);
   await sql.query('SELECT pg_advisory_xact_lock(17382912)');
   const [old]=await sql.query<{id:string;input_hash:string;status:string;game_id:string|null}>(`SELECT r.id,r.input_hash,r.status,g.id AS game_id FROM ai_sprint_generation r LEFT JOIN quiz_game g ON g.generation_id=r.id WHERE r.user_id=$1 AND r.request_key=$2`,[user.id,v.requestKey]);
   if(old){if(old.input_hash!==hash)throw new AuthError(409,'request_changed','Utilise une nouvelle demande pour un sujet différent.');if(old.status==='published')return {gameId:old.game_id!};if(old.status==='pending')throw new AuthError(409,'sprint_pending','La génération est en cours. Vérifie à nouveau dans quelques instants.');throw new AuthError(409,'sprint_failed','Cette demande a échoué. Commence une nouvelle demande.');}
   const [category]=await sql.query<{name:string}>('SELECT name FROM game_category WHERE id=$1 AND active FOR SHARE',[v.categoryId]);
   if(!category)throw new AuthError(400,'invalid_category','Choisis une catégorie disponible.');
   const [count]=await sql.query<{total:number;personal:number}>(`SELECT count(*)::integer AS total,count(*) FILTER(WHERE user_id=$1)::integer AS personal FROM ai_sprint_generation WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,[user.id]);
   if(count.personal>=3||count.total>=30)throw new AuthError(429,'sprint_daily_limit',count.personal>=3?'Tu as atteint tes 3 générations du jour. Reviens demain.':'Les 30 générations du jour sont utilisées. Reviens demain.');
   const [row]=await sql.query<{id:string}>('INSERT INTO ai_sprint_generation(user_id,request_key,input_hash,model) VALUES($1,$2,$3,$4) RETURNING id',[user.id,v.requestKey,hash,this.model]);
   return {id:row.id,category:category.name};
  });
  if('gameId' in reservation)return {id:reservation.gameId,message:'Sprint déjà créé.'};
  try{
   const generated=validateSprint(await this.generate({topic:v.topic,category:reservation.category,level:v.level}));
   return await this.db.transaction(async sql=>{
    const user=await new MentoringService(this.db).actor(sql,account);
    if(!(await sql.query('SELECT id FROM game_category WHERE id=$1 AND active FOR SHARE',[v.categoryId])).length)throw unavailable();
    const [row]=await sql.query<{status:string}>('SELECT status FROM ai_sprint_generation WHERE id=$1 FOR UPDATE',[reservation.id]);
    if(row?.status!=='pending')throw unavailable();
    const [game]=await sql.query<{id:string}>(`INSERT INTO quiz_game(author_id,title,description,category_id,level,duration_minutes,points_per_answer,status,published_at,generation_id) VALUES($1,$2,$3,$4,$5,3,10,'published',now(),$6) RETURNING id`,[user.id,generated.title,generated.description,v.categoryId,v.level,reservation.id]);
    for(const [i,q] of generated.questions.entries()){
     const [question]=await sql.query<{id:string}>('INSERT INTO quiz_question(author_id) VALUES($1) RETURNING id',[user.id]);
     const [version]=await sql.query<{id:string}>(`INSERT INTO quiz_question_version(question_id,version,created_by,category_id,level,stem,options,correct_index,explanation,source,status,generation_id) VALUES($1,1,$2,$3,$4,$5,$6,$7,$8,'','ai_ready',$9) RETURNING id`,[question.id,user.id,v.categoryId,v.level,q.stem,q.options,q.correctIndex,q.explanation,reservation.id]);
     await sql.query('INSERT INTO game_question(game_id,ordinal,version_id) VALUES($1,$2,$3)',[game.id,i,version.id]);
    }
    await sql.query("UPDATE ai_sprint_generation SET status='published' WHERE id=$1",[reservation.id]);
    await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,'play.sprint.generated','play',$2)",[user.id,game.id]);
    return {id:game.id,message:'Ton Sprint IA est prêt et disponible parmi les jeux publics.'};
   });
  }catch(error){
   await this.db.query("UPDATE ai_sprint_generation SET status='failed' WHERE id=$1 AND status='pending'",[reservation.id]);
   if(error instanceof AuthError)throw error;throw unavailable();
  }
 }
 async report(account:Account|null,input:unknown){
  const v=z.object({gameId:z.uuid(),reason:z.enum(['incorrect','inappropriate','personal_data'])}).strict().parse(input);
  return this.db.transaction(async sql=>{
   const user=await new MentoringService(this.db).actor(sql,account);
   const [game]=await sql.query('SELECT id FROM quiz_game WHERE id=$1 AND generation_id IS NOT NULL AND status=\'published\'',[v.gameId]);
   if(!game)throw new AuthError(404,'not_found','Sprint introuvable.');
   await sql.query('INSERT INTO ai_sprint_report(game_id,user_id,reason) VALUES($1,$2,$3) ON CONFLICT(game_id,user_id) DO NOTHING',[v.gameId,user.id,v.reason]);
   return {message:'Signalement transmis à l’administration.'};
  });
 }
 async reports(account:Account|null,input:unknown){
  const v=z.object({status:z.enum(['published','archived','all']).default('published'),after:z.union([z.literal(''),z.uuid()]).default('')}).strict().parse(input);
  return this.db.transaction(async sql=>{
   await new MentoringService(this.db).actor(sql,account,'admin');
   const rows=await sql.query<{id:string;title:string;status:string;reports:number;incorrect:number;inappropriate:number;personal_data:number}>(`SELECT g.id,g.title,g.status,count(*)::integer AS reports,
    count(*) FILTER(WHERE r.reason='incorrect')::integer AS incorrect,
    count(*) FILTER(WHERE r.reason='inappropriate')::integer AS inappropriate,
    count(*) FILTER(WHERE r.reason='personal_data')::integer AS personal_data
    FROM quiz_game g JOIN ai_sprint_report r ON r.game_id=g.id
    WHERE g.generation_id IS NOT NULL AND ($1='all' OR g.status=$1) AND ($2::uuid IS NULL OR g.id>$2::uuid)
    GROUP BY g.id ORDER BY g.id LIMIT 21`,[v.status,v.after||null]);
   const more=rows.length>20,items=rows.slice(0,20);return {items,next:more?items[items.length-1].id:null};
  });
 }
 async review(account:Account|null,input:unknown){
  const id=z.uuid().parse(input);
  return this.db.transaction(async sql=>{
   await new MentoringService(this.db).actor(sql,account,'admin');
   const [game]=await sql.query<{id:string;title:string;description:string;status:string;model:string;created_at:string}>(`SELECT g.id,g.title,g.description,g.status,r.model,g.created_at FROM quiz_game g JOIN ai_sprint_generation r ON r.id=g.generation_id WHERE g.id=$1`,[id]);
   if(!game)throw new AuthError(404,'not_found','Sprint introuvable.');
   const questions=await sql.query(`SELECT v.stem,v.options,v.correct_index,v.explanation FROM game_question x JOIN quiz_question_version v ON v.id=x.version_id WHERE x.game_id=$1 ORDER BY x.ordinal`,[id]);
   return {...game,questions};
  });
 }
 async archive(account:Account|null,input:unknown){
  const v=z.object({gameId:z.uuid(),confirm:z.literal(true)}).strict().parse(input);
  return this.db.transaction(async sql=>{
   const user=await new MentoringService(this.db).actor(sql,account,'admin');
   const [game]=await sql.query<{status:string}>('SELECT status FROM quiz_game WHERE id=$1 AND generation_id IS NOT NULL FOR UPDATE',[v.gameId]);
   if(!game)throw new AuthError(404,'not_found','Sprint introuvable.');
   if(game.status==='archived')return {message:'Ce Sprint est déjà retiré du catalogue.'};
   if(game.status!=='published')throw new AuthError(409,'conflict','Ce Sprint ne peut pas être retiré dans cet état.');
   await sql.query("UPDATE quiz_game SET status='archived',reviewed_by=$2 WHERE id=$1",[v.gameId,user.id]);
   await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,'play.sprint.archived','play',$2)",[user.id,v.gameId]);
   return {message:'Sprint retiré du catalogue. Les parties déjà commencées restent consultables.'};
  });
 }
}
