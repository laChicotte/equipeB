import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
import type {Database} from '../src/server/database.ts';
import {PlanningService} from '../src/modules/planning/service.ts';
import {seedMessagingFixture} from '../tests/fixtures/messaging.ts';
process.loadEnvFile('.env.local');
if(process.env.NODE_ENV==='production'||process.env.DB_DRIVER==='pglite')throw new Error('Development PostgreSQL required');
const db=await getDatabase(),rollback=new Error('Synthetic rollback');let verified=false;
try{try{await db.transaction(async sql=>{const isolated:Database={...sql,transaction:fn=>fn(sql),close:async()=>{}};const f=await seedMessagingFixture(isolated),s=new PlanningService(isolated,true,true);
 const input={programId:f.programId,clientId:randomUUID(),title:'Séance fictive transactionnelle',startsAt:new Date(Date.now()+86400000).toISOString(),durationMinutes:45};const proposal=await s.propose(f.mentor,input);assert.equal((await s.propose(f.mentor,input)).id,proposal.id);
 await s.sessionAction(f.mentee,{programId:f.programId,id:proposal.id,revision:1,action:'confirm'});await assert.rejects(s.propose(f.mentor,{...input,clientId:randomUUID()}),{code:'time_conflict'});
 const o=await s.objective(f.mentee,{programId:f.programId,clientId:randomUUID(),title:'Objectif fictif de vérification',dueDate:null});await s.objectiveAction(f.mentor,{programId:f.programId,id:o.id,revision:1,status:'done'});
 const board=await s.board(f.mentee,{programId:f.programId});assert.equal(board.sessions[0].status,'confirmed');assert.equal(board.objectives[0].status,'done');await assert.rejects(s.board(f.other,{programId:f.programId}),{status:404});verified=true;throw rollback;})}catch(e){if(e!==rollback)throw e}
 if(!verified)throw new Error('Not verified');console.log('PostgreSQL natif : proposition, confirmation, conflits, objectifs et isolation vérifiés. Transaction annulée, aucune donnée fictive conservée.');
}catch{console.error('Vérification planning PostgreSQL échouée. Transaction annulée ; aucun identifiant affiché.');process.exitCode=1}finally{await db.close()}
