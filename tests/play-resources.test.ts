import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedPlayFixture} from './fixtures/play.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {handlePlay} from '../src/server/play-http.ts';

test('Play et bibliothèque : recommandations publiées, thématiques et limitées après la partie',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);const f=await seedPlayFixture(db),play=new PlayService(db),owner=randomBytes(32).toString('hex');
 const users=await db.query<{id:string}>("SELECT id FROM app_user WHERE role='admin' ORDER BY id");const [category]=await db.query<{name:string}>('SELECT name FROM game_category WHERE id=$1',[f.categoryId]);
 async function resource(domain:string,status='published',index=0){const [r]=await db.query<{id:string}>(`INSERT INTO library_resource(author_id,title,summary,category,kind,body,rights,status,reviewed_by,created_at) VALUES($1,'Guide synthétique','Résumé suffisamment long pour ce test.',$2,'guide','Corps original synthétique uniquement pour les tests.','Droits fictifs pour la fixture.',$3,$4,'2026-01-01'::timestamptz+$5*interval '1 second') RETURNING id`,[users[0].id,domain,status,status==='published'?users[1].id:null,index]);return r.id}
 for(let i=0;i<5;i++)await resource(i===0?' '+category.name.toUpperCase()+' ':category.name,'published',i);
 await resource(category.name,'submitted',50);await resource(category.name,'rejected',60);await resource(category.name,'archived',70);await resource('Autre domaine sans rapport','published',80);
 const a=await play.start(owner,null,{gameId:f.gameId});await assert.rejects(play.recommendations(owner,null,a.id,false,true),{status:409});
 for(const [index,choice] of [0,1,2].entries())await play.answer(owner,null,{attemptId:a.id,index,choice});
 const rec=await play.recommendations(owner,null,a.id,false,true);assert.equal(rec.resources.enabled,true);assert.equal(rec.resources.items.length,3);assert.ok(rec.resources.items.every(r=>r.category.trim().toLowerCase()===category.name.toLowerCase()));assert.ok(rec.resources.search.includes(encodeURIComponent(category.name)));
 const payload=JSON.stringify(rec.resources);for(const key of ['author_id','body','rights','reviewed_by','file_id','source_url','correct_index'])assert.ok(!payload.includes('"'+key+'"'));
 assert.equal((await play.recommendations(owner,null,a.id)).resources.enabled,false);assert.equal((await play.recommendations(owner,null,a.id,false,false)).resources.items.length,0);
 await assert.rejects(play.recommendations(randomBytes(32).toString('hex'),null,a.id,false,true),{status:404});
 const withdrawn=rec.resources.items[0].id;await db.query("UPDATE library_resource SET status='archived' WHERE id=$1",[withdrawn]);assert.ok(!(await play.recommendations(owner,null,a.id,false,true)).resources.items.some(r=>r.id===withdrawn));
 const config=()=>({origin:'http://localhost',secure:false,secret:'x'.repeat(40),enabled:true});const deps={db:async()=>db,config,account:async()=>null,resourcesEnabled:()=>true};const url='http://localhost/api/v1/play/recommendations?id='+a.id;
 assert.equal((await handlePlay(new Request(url),'recommendations',deps)).status,404);const response=await handlePlay(new Request(url,{headers:{cookie:'tl_play='+owner}}),'recommendations',deps);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).resources.items.length,3);
 await db.query("UPDATE library_resource SET status='archived' WHERE status='published'");assert.deepEqual((await play.recommendations(owner,null,a.id,false,true)).resources.items,[]);
});
