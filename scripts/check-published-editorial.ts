import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
process.loadEnvFile('.env.local');
const base='https://talentlink.today',published=JSON.parse(await readFile('.local/editorial-publication.json','utf8')),pack=JSON.parse(await readFile('editorial/launch-quizzes.v1.json','utf8')),db=await getDatabase();
const created:{id:string;gameId:string;ownerHash:string}[]=[],results:unknown[]=[];let passed=false;
const post=(action:string,input:unknown,cookie='')=>fetch(base+'/api/v1/play/'+action+'/',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',cookie},body:JSON.stringify(input),signal:AbortSignal.timeout(30000)});
try{
 const catalog=await(await fetch(base+'/api/v1/play/catalog/',{signal:AbortSignal.timeout(30000)})).json();
 for(const item of published.publication){assert.ok(catalog.items.some((g:{id:string})=>g.id===item.id));const definition=pack.games.find((g:{slug:string})=>g.slug===item.slug);assert.ok(definition);
 const page=await fetch(item.url,{signal:AbortSignal.timeout(30000)});assert.equal(page.status,200);
 const start=await post('start',{gameId:item.id,saveHistory:false});assert.equal(start.status,201);const started=await start.json(),cookie=start.headers.get('set-cookie')!.split(';')[0],token=cookie.slice(cookie.indexOf('=')+1);created.push({id:started.id,gameId:item.id,ownerHash:createHash('sha256').update(token).digest('hex')});
 const state=async()=>{const r=await fetch(base+'/api/v1/play/state/?id='+started.id,{headers:{cookie},signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);return r.json()};
 const initial=await state();assert.equal(initial.total,4);assert.equal(initial.score,0);assert.equal(initial.question.options.length,3);assert.ok(!('correctIndex' in initial.question));assert.ok(!('explanation' in initial.question));
 for(const [index,q] of definition.questions.entries()){const answer=await post('answer',{attemptId:started.id,index,choice:q.correctIndex},cookie);assert.equal(answer.status,200);assert.equal((await answer.json()).correct,true);if(index===0){assert.equal((await post('answer',{attemptId:started.id,index,choice:q.correctIndex},cookie)).status,200);const replayed=await state();assert.equal(replayed.score,10);assert.equal(replayed.answered,1)}}
 const final=await state();assert.equal(final.completed,true);assert.equal(final.score,40);assert.equal(final.percentage,100);results.push({slug:item.slug,id:item.id,questions:final.total,score:final.score,completed:final.completed});
 }
 assert.equal((await fetch(base+'/editorial/launch-quizzes.v1.json',{signal:AbortSignal.timeout(30000)})).status,404);assert.equal((await fetch(base+'/api/v1/play/questions/',{signal:AbortSignal.timeout(30000)})).status,401);const auth=await(await fetch(base+'/api/v1/auth/config/',{signal:AbortSignal.timeout(30000)})).json();assert.equal(auth.registrationEnabled,false);passed=true;
}finally{
 let deleted=0;
 for(const attempt of created){const rows=await db.query('DELETE FROM game_attempt WHERE id=$1 AND game_id=$2 AND owner_hash=$3 AND user_id IS NULL RETURNING id',[attempt.id,attempt.gameId,attempt.ownerHash]);deleted+=rows.length}
 await db.close();assert.equal(deleted,created.length,'Only self-created visitor test attempts must be removed');await writeFile('.local/editorial-publication-check.json',JSON.stringify({checkedAt:new Date().toISOString(),passed,results,testAttemptsRemoved:deleted},null,2));console.log(JSON.stringify({passed,results,testAttemptsRemoved:deleted}));
}
