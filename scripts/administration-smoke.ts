import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
import type {Database} from '../src/server/database.ts';
import {AdministrationService} from '../src/modules/administration/service.ts';
import {seedMessagingFixture} from '../tests/fixtures/messaging.ts';
process.loadEnvFile('.env.local');
if(process.env.NODE_ENV==='production'||process.env.DB_DRIVER==='pglite')throw new Error('Development PostgreSQL required');
const db=await getDatabase(),rollback=new Error('Synthetic rollback');let verified=false;
try{try{await db.transaction(async sql=>{const isolated:Database={...sql,transaction:fn=>fn(sql),close:async()=>{}};const f=await seedMessagingFixture(isolated),s=new AdministrationService(isolated);const data=await s.overview(f.admin);assert.ok(data.counts.active_accounts>=5);await assert.rejects(s.overview(f.moderator),{status:403});const audit=await s.audit(f.admin,{resource:'mentoring'});assert.ok(audit.items.length>0);assert.ok(audit.items.every(e=>e.resource_type==='mentoring'));assert.ok(!JSON.stringify(audit).includes('@'));verified=true;throw rollback;})}catch(e){if(e!==rollback)throw e}
 if(!verified)throw new Error('Not verified');console.log('PostgreSQL natif : indicateurs, audit et refus du rôle modérateur vérifiés. Transaction annulée ; aucune donnée fictive conservée.');
}catch{console.error('Vérification administration PostgreSQL échouée. Aucun identifiant affiché.');process.exitCode=1}finally{await db.close()}
