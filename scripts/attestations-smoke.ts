import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
import type {Database} from '../src/server/database.ts';
import {AttestationService} from '../src/modules/attestations/service.ts';
import {seedAttestationFixture} from '../tests/fixtures/attestations.ts';
process.loadEnvFile('.env.local');
if(process.env.NODE_ENV==='production'||process.env.DB_DRIVER==='pglite')throw new Error('Development PostgreSQL required');
const db=await getDatabase(),rollback=new Error('Synthetic rollback');let verified=false;
try{try{await db.transaction(async sql=>{const isolated:Database={...sql,transaction:fn=>fn(sql),close:async()=>{}};const f=await seedAttestationFixture(isolated),s=new AttestationService(isolated,true),closed=new AttestationService(isolated);const issued=await s.issue(f.admin,{programId:f.programId});assert.equal((await s.issue(f.admin,{programId:f.programId})).id,issued.id);await assert.rejects(s.detail(f.other,{id:issued.id}),{status:404});assert.equal((await s.detail(f.mentee,{id:issued.id})).completed_sessions,1);await closed.revoke(f.admin,{id:issued.id,revision:1,reason:'Révocation synthétique dans une transaction annulée.'});assert.ok((await closed.detail(f.mentee,{id:issued.id})).revoked_at);await assert.rejects(s.issue(f.admin,{programId:f.programId}),{code:'revoked'});verified=true;throw rollback;})}catch(e){if(e!==rollback)throw e}
 if(!verified)throw new Error('Not verified');console.log('PostgreSQL natif : émission, rejeu, isolation et révocation vérifiés. Transaction annulée ; aucune attestation réelle ni donnée fictive conservée.');
}catch{console.error('Vérification attestations PostgreSQL échouée. Aucun identifiant affiché.');process.exitCode=1}finally{await db.close()}
