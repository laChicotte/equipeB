import {z} from 'zod';
import {createHash} from 'node:crypto';
import type {Database} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {AuthError} from '../identity/errors.ts';
import {PlayService} from './service.ts';
import {questionSchema,level} from './schemas.ts';
const editorialQuestion=questionSchema.omit({questionId:true,categoryId:true,level:true}).extend({source:z.string().url().max(400).refine(value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}})});
export const editorialPackSchema=z.strictObject({sourceCheckedAt:z.iso.date(),games:z.array(z.strictObject({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),title:z.string().trim().min(3).max(100),description:z.string().trim().min(20).max(1500),category:z.string().min(2).max(100),level,durationMinutes:z.number().int().min(1).max(120),pointsPerAnswer:z.number().int().min(1).max(100),questions:z.array(editorialQuestion).min(1).max(30)})).min(1).max(20)}).superRefine((p,ctx)=>{if(new Set(p.games.map(g=>g.slug)).size!==p.games.length)ctx.addIssue({code:'custom',message:'Duplicate quiz slug'});const stems=p.games.flatMap(g=>g.questions.map(q=>q.stem.toLocaleLowerCase().trim()));if(new Set(stems).size!==stems.length)ctx.addIssue({code:'custom',message:'Duplicate question'});if(p.sourceCheckedAt>new Date().toISOString().slice(0,10))ctx.addIssue({code:'custom',message:'Future source check date'})});
/** Import only into submitted state. Importer identity is recorded, never misrepresented as author. */
export async function importEditorialPack(db:Database,account:Account|null,input:unknown){const pack=editorialPackSchema.parse(input);return db.transaction(async sql=>{
 const u=await new PlayService(db).actor(sql,account,true),result=[];let questionsSubmitted=0;
 for(const slug of pack.games.map(g=>g.slug).sort())await sql.query('SELECT pg_advisory_xact_lock(hashtext($1))',['editorial:'+slug]);
 for(const game of pack.games){const hash=createHash('sha256').update(JSON.stringify({sourceCheckedAt:pack.sourceCheckedAt,game})).digest('hex');
 const [category]=await sql.query<{id:string}>('SELECT id FROM game_category WHERE name=$1 AND active FOR SHARE',[game.category]);if(!category)throw new AuthError(400,'invalid_category','Catégorie éditoriale absente ou inactive.');
 const [existing]=await sql.query<{id:string;content_hash:string}>('SELECT id,content_hash FROM editorial_quiz_batch WHERE slug=$1',[game.slug]);if(existing){if(existing.content_hash!==hash)throw new AuthError(409,'editorial_conflict','Le lot a changé : créez une nouvelle version du lot.');result.push({slug:game.slug,id:existing.id,imported:false});continue}
 const [batch]=await sql.query<{id:string}>(`INSERT INTO editorial_quiz_batch(slug,content_hash,sources_checked_at,imported_by,category_id,title,description,level,duration_minutes,points_per_answer) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[game.slug,hash,pack.sourceCheckedAt,u.id,category.id,game.title,game.description,game.level,game.durationMinutes,game.pointsPerAnswer]);
 for(const [ordinal,q] of game.questions.entries()){const [question]=await sql.query<{id:string}>('INSERT INTO quiz_question(author_id,editorial_batch_id,editorial_ordinal) VALUES(NULL,$1,$2) RETURNING id',[batch.id,ordinal]);await sql.query(`INSERT INTO quiz_question_version(question_id,version,category_id,level,stem,options,correct_index,explanation,source,created_by,editorial_batch_id,status) VALUES($1,1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,'submitted')`,[question.id,category.id,game.level,q.stem,q.options,q.correctIndex,q.explanation,q.source,batch.id])}
 await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,'play.editorial.submitted','play',$2)",[u.id,batch.id]);questionsSubmitted+=game.questions.length;result.push({slug:game.slug,id:batch.id,imported:true});
 }return {batches:result,questionsSubmitted};
})}
