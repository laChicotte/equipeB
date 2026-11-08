import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {weeklyChallenges} from '../src/modules/play/weekly-challenges.ts';
import {PlayProgressService} from '../src/modules/play/progress.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedPlayFixture} from './fixtures/play.ts';
import {seedMessagingFixture} from './fixtures/messaging.ts';

test('défis : objectifs distincts, valeurs bornées et aucun score imposé',()=>{
 assert.ok(weeklyChallenges({completed:0,games:0,days:0}).every(c=>!c.achieved&&c.current===0));
 const challenges=weeklyChallenges({completed:9,games:1,days:2});assert.deepEqual(challenges.map(c=>[c.current,c.achieved]),[[3,true],[1,false],[2,true]]);
});

test('défis : semaine UTC, bornes, parties complètes, consentement et isolation',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);const fixture=await seedPlayFixture(db),f=await seedMessagingFixture(db),play=new PlayService(db),progress=new PlayProgressService(db),owner=randomBytes(32).toString('hex');
 const first=await play.start(owner,f.mentee,{gameId:fixture.gameId,saveHistory:true});for(const [index,choice] of [0,1,2].entries())await play.answer(owner,f.mentee,{attemptId:first.id,index,choice});
 const [secondGame]=await db.query<{id:string}>(`INSERT INTO quiz_game(author_id,title,description,category_id,level,duration_minutes,points_per_answer,status,reviewed_by,published_at) SELECT author_id,'Deuxième quiz synthétique',description,category_id,level,duration_minutes,points_per_answer,status,reviewed_by,published_at FROM quiz_game WHERE id=$1 RETURNING id`,[fixture.gameId]);
 await db.query('INSERT INTO game_question(game_id,ordinal,version_id) SELECT $2,ordinal,version_id FROM game_question WHERE game_id=$1',[fixture.gameId,secondGame.id]);
 const [period]=await db.query<{start:string;end:string;today:number}>(`SELECT to_char(date_trunc('week',now() AT TIME ZONE 'UTC'),'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start,to_char(date_trunc('week',now() AT TIME ZONE 'UTC')+interval '7 days','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "end",extract(isodow FROM now() AT TIME ZONE 'UTC')::integer AS today`);
 await db.query("UPDATE game_attempt SET completed_at=$2::timestamptz,started_at=$2::timestamptz-interval '1 minute' WHERE id=$1",[first.id,period.start]);
 async function copy(user:string|null,game:string,completion:string|null,cursor=3){await db.query(`INSERT INTO game_attempt(game_id,owner_hash,user_id,snapshot,cursor,score,points_per_answer,started_at,completed_at) SELECT $2,owner_hash,$3,snapshot,$4,score,points_per_answer,coalesce($5::timestamptz,now())-interval '1 minute',$5::timestamptz FROM game_attempt WHERE id=$1`,[first.id,game,user,cursor,completion])}
 const now=new Date().toISOString();await copy(f.mentee.id,secondGame.id,now);await copy(f.mentee.id,secondGame.id,now);
 await copy(null,secondGame.id,now);await copy(f.other.id,secondGame.id,now);await copy(f.mentee.id,secondGame.id,null,0);await copy(f.mentee.id,secondGame.id,now,1);
 await copy(f.mentee.id,secondGame.id,new Date(new Date(period.start).getTime()-1).toISOString());await copy(f.mentee.id,secondGame.id,period.end);
 const result=await progress.progress(f.mentee);assert.equal(result.weekly.startsAt,period.start);assert.equal(result.weekly.endsAt,period.end);assert.equal(result.weekly.timeZone,'UTC');assert.deepEqual(result.weekly.challenges.map(c=>c.current),[3,2,period.today===1?1:2]);assert.deepEqual((await progress.progress(f.other)).weekly.challenges.map(c=>c.current),[1,1,1]);
 // An unrelated database session timezone must not change the calendar boundaries.
 await db.exec("SET TIME ZONE 'Pacific/Auckland'");assert.deepEqual((await progress.progress(f.mentee)).weekly,result.weekly);
 await assert.rejects(progress.progress(null),{status:401});await db.query('UPDATE app_user SET adult_access_approved_at=NULL WHERE id=$1',[f.mentee.id]);await assert.rejects(progress.progress(f.mentee),{status:403});
});
