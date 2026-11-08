import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedDatabase} from '../src/server/database.ts';
import {migrate} from '../src/server/migrations.ts';
import {seedMessagingFixture} from './fixtures/messaging.ts';
import {LibraryEditorialService} from '../src/modules/learning/editorial.ts';
import {starterGuides,starterRights} from '../src/modules/learning/starter-guides.ts';
import {LearningService} from '../src/modules/learning/service.ts';
import {handleLearning} from '../src/server/learning-http.ts';

test('guides : trois textes originaux à relire, domaines Play et références HTTPS',()=>{
 assert.equal(starterGuides.length,3);assert.equal(new Set(starterGuides.map(g=>g.key)).size,3);assert.deepEqual(starterGuides.map(g=>g.category),['Technologie et numérique','Sciences','Environnement']);assert.ok(starterRights.includes('assistance IA'));
 for(const guide of starterGuides){assert.ok(guide.body.length>=800&&guide.body.length<=30000);assert.ok(guide.summary.length>=15&&guide.summary.length<=600);assert.equal(new URL(guide.sourceUrl).protocol,'https:');assert.ok(!guide.sourceUrl.includes('@'));}
});

test('bibliothèque éditoriale : import administrateur, provenance, relecture et rejeu',async t=>{
 const db=await embeddedDatabase();t.after(()=>db.close());await migrate(db);const f=await seedMessagingFixture(db),service=new LibraryEditorialService(db),learning=new LearningService(db);
 for(const user of [null,f.mentee,f.mentor,f.moderator])await assert.rejects(service.preview(user),{status:user?403:401});assert.equal((await service.preview(f.admin)).items.length,3);
 await assert.rejects(service.submit(f.admin,{reviewRequired:false}));await assert.rejects(service.submit(f.admin,{reviewRequired:true,publish:true}));
 const imports=await Promise.all([service.submit(f.admin,{reviewRequired:true}),service.submit(f.admin,{reviewRequired:true})]);assert.equal(imports.reduce((n,r)=>n+r.created,0),3);
 const rows=await db.query<{id:string;author_id:null;imported_by:string;editorial_hash:string;status:string}>('SELECT id,author_id,imported_by,editorial_hash,status FROM library_resource ORDER BY editorial_key');assert.equal(rows.length,3);assert.ok(rows.every(r=>r.author_id===null&&r.imported_by===f.admin.id&&r.status==='submitted'&&r.editorial_hash.length===64));assert.equal((await learning.resources(null,{})).total,0);
 const [audit]=await db.query<{n:number}>("SELECT count(*)::integer AS n FROM audit_event WHERE action='library.editorial.submitted'");assert.equal(audit.n,3);
 await assert.rejects(learning.resource(rows[0].id),{status:404});await assert.rejects(learning.review(f.mentor,{id:rows[0].id,type:'resource',decision:'published'}),{status:403});
 // Assisted texts have no invented human author; the importer is separately audited.
 await learning.review(f.admin,{id:rows[0].id,type:'resource',decision:'published'});assert.equal((await learning.resources(null,{})).total,1);assert.ok((await learning.resource(rows[0].id)).rights);
 await learning.review(f.moderator,{id:rows[1].id,type:'resource',decision:'rejected'});await learning.review(f.admin,{id:rows[0].id,type:'resource',decision:'hidden'});assert.equal((await service.submit(f.admin,{reviewRequired:true})).created,0);assert.equal((await learning.resources(null,{})).total,0);
 const [notice]=await db.query<{n:number}>('SELECT count(*)::integer AS n FROM learning_notice');assert.equal(notice.n,0);
 await assert.rejects(db.query('UPDATE library_resource SET imported_by=NULL WHERE id=$1',[rows[0].id]));await assert.rejects(db.query('UPDATE library_resource SET author_id=$2 WHERE id=$1',[rows[0].id,f.admin.id]));
 await db.query('UPDATE library_resource SET editorial_hash=$2 WHERE id=$1',[rows[0].id,'0'.repeat(64)]);await assert.rejects(service.submit(f.admin,{reviewRequired:true}),{status:409});await db.query('UPDATE library_resource SET editorial_hash=$2 WHERE id=$1',[rows[0].id,rows[0].editorial_hash]);
 await db.query("UPDATE app_user SET role='mentee' WHERE id=$1",[f.admin.id]);await assert.rejects(service.preview(f.admin),{status:403});await db.query("UPDATE app_user SET role='admin' WHERE id=$1",[f.admin.id]);
 const deps={enabled:()=>true,db:async()=>db,account:async()=>f.admin,origin:()=> 'http://localhost',secret:()=> 'x'.repeat(40)};const url='http://localhost/api/v1/learning/starter-guides/';
 assert.equal((await handleLearning(new Request(url),'starter-guides',{...deps,account:async()=>null})).status,401);const preview=await handleLearning(new Request(url),'starter-guides',deps);assert.equal(preview.status,200);assert.equal(preview.headers.get('cache-control'),'no-store');
 assert.equal((await handleLearning(new Request(url+'?publish=true'),'starter-guides',deps)).status,400);assert.equal((await handleLearning(new Request(url,{method:'POST',headers:{origin:'https://evil.invalid'},body:'{}'}),'starter-guides',deps)).status,403);
 assert.equal((await handleLearning(new Request(url,{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({reviewRequired:true})}),'starter-guides',deps)).status,201);
});
