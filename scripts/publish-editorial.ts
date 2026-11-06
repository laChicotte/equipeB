import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
import type {Database} from '../src/server/database.ts';
import type {Account} from '../src/modules/identity/access.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {editorialPackSchema} from '../src/modules/play/editorial.ts';
process.loadEnvFile('.env.local');
const args=process.argv.slice(2),index=args.indexOf('--admin-email'),email=index>=0?args[index+1]:undefined,apply=args.includes('--apply');
if(!email||process.env.DB_DRIVER==='pglite')throw Error('Existing administrator and PostgreSQL required');
const pack=editorialPackSchema.parse(JSON.parse(await readFile('editorial/launch-quizzes.v1.json','utf8'))),db=await getDatabase(),rollback=new Error('Dry run rollback');
const note='Validation éditoriale explicite de l’administrateur dans le chat le 6 novembre 2026 : trois quiz et douze questions du dossier de relecture.';
assert.equal(createHash('sha256').update(JSON.stringify(pack)).digest('hex'),'f0ff5ab98188947b855c34196ce8554f0493a0cb5dcaa81e91973c4e01bdd439','This command is restricted to the exact launch packet approved on 2026-11-06');
let publication:unknown[]=[];
try{try{await db.transaction(async sql=>{
 const nested:Database={...sql,transaction:fn=>fn(sql),close:async()=>{}};const play=new PlayService(nested);
 const [account]=await sql.query<{id:string;role:string}>("SELECT id,role FROM app_user WHERE lower(email)=lower($1) AND role='admin' AND disabled_at IS NULL AND email_verified_at IS NOT NULL",[email]);assert.ok(account,'Administrator unavailable');const actor=account as Account;await play.actor(sql,actor,true);
 for(const slug of pack.games.map(g=>g.slug).sort())await sql.query('SELECT pg_advisory_xact_lock(hashtext($1))',['editorial:'+slug]);
 const prepared=[];
 for(const game of pack.games){const hash=createHash('sha256').update(JSON.stringify({sourceCheckedAt:pack.sourceCheckedAt,game})).digest('hex');const [batch]=await sql.query<{id:string;content_hash:string;category_id:string}>('SELECT id,content_hash,category_id FROM editorial_quiz_batch WHERE slug=$1 FOR UPDATE',[game.slug]);assert.ok(batch,'Reviewed batch missing');assert.equal(batch.content_hash,hash,'Reviewed file differs from imported batch');
 const versions=await sql.query<{id:string;stem:string;options:string[];correct_index:number;explanation:string;source:string;status:string;created_by:string|null;author_id:string|null;version:number}>(`SELECT v.*,q.author_id FROM quiz_question q JOIN quiz_question_version v ON v.question_id=q.id AND v.editorial_batch_id=q.editorial_batch_id WHERE q.editorial_batch_id=$1 ORDER BY q.editorial_ordinal FOR UPDATE OF v`,[batch.id]);assert.equal(versions.length,game.questions.length);
 for(const [i,v] of versions.entries()){const q=game.questions[i];assert.equal(v.version,1);assert.equal(v.created_by,null);assert.equal(v.author_id,null);assert.equal(v.stem,q.stem);assert.deepEqual(v.options,q.options);assert.equal(v.correct_index,q.correctIndex);assert.equal(v.explanation,q.explanation);assert.equal(v.source,q.source);assert.ok(['submitted','in_review','approved'].includes(v.status),'Question rejected or archived');}
 prepared.push({game,batch,versions});
 }
 for(const {game,batch,versions} of prepared){for(const v of versions)if(v.status!=='approved')await play.reviewQuestion(actor,{id:v.id,decision:'approved',note});const ids=versions.map(v=>v.id);
 const existing=await sql.query<{id:string;status:string;author_id:string}>(`SELECT g.id,g.status,g.author_id FROM quiz_game g WHERE g.category_id=$1 AND g.title=$2 AND g.description=$3 AND g.level=$4 AND g.duration_minutes=$5 AND g.points_per_answer=$6 AND (SELECT array_agg(version_id ORDER BY ordinal) FROM game_question WHERE game_id=g.id)=$7::uuid[]`,[batch.category_id,game.title,game.description,game.level,game.durationMinutes,game.pointsPerAnswer,ids]);assert.ok(existing.length<=1,'Duplicate composed games require manual review');let current=existing[0];
 if(!current){const created=await play.createGame(actor,{title:game.title,description:game.description,categoryId:batch.category_id,level:game.level,durationMinutes:game.durationMinutes,pointsPerAnswer:game.pointsPerAnswer,questionIds:ids});current={id:created.id,status:'draft',author_id:actor.id}}
 if(current.status!=='published'){assert.equal(current.author_id,actor.id,'A different account composed this quiz');assert.ok(['draft','submitted'].includes(current.status),'Game archived');if(current.status==='draft')await play.submitGame(actor,current.id);await play.reviewGame(actor,current.id,true)}
 publication.push({slug:game.slug,id:current.id,title:game.title,questions:ids.length,url:'https://talentlink.today/play/'+current.id+'/'});
 }
 if(!apply)throw rollback;
 })}catch(e){if(e!==rollback)throw e}
 if(apply){await mkdir('.local',{recursive:true});await writeFile('.local/editorial-publication.json',JSON.stringify({publishedAt:new Date().toISOString(),publication},null,2));console.log(JSON.stringify({applied:true,publication}));}else console.log(JSON.stringify({dryRun:true,quizCount:publication.length,questions:12,rolledBack:true}));
}catch(e){console.error(e instanceof assert.AssertionError?'Publication refusée : '+e.message:'Publication indisponible. Aucun identifiant privé affiché.');process.exitCode=1}finally{await db.close()}
