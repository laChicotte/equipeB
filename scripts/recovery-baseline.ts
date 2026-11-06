import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
process.loadEnvFile('.env.local');
const mode=process.argv[2]||'capture',source=process.env.DATABASE_URL;
if(!source||!['capture','verify'].includes(mode))throw Error('Mode capture or verify and configured PostgreSQL required');
const identity=(url:string)=>{const parsed=new URL(url);return createHash('sha256').update(parsed.hostname+parsed.pathname).digest('hex')};
const sourceEndpoint=identity(source);
if(mode==='verify'){const target=process.env.RECOVERY_DATABASE_URL;if(!target)throw Error('Set RECOVERY_DATABASE_URL privately before verification');assert.ok(new URL(target).hostname!==new URL(source).hostname,'Recovery target must use a distinct endpoint');assert.notEqual(identity(target),sourceEndpoint,'Recovery target must use a distinct endpoint');process.env.DATABASE_URL=target;}
if(process.env.DB_DRIVER==='pglite')throw Error('Native PostgreSQL required');
const db=await getDatabase();
try{const snapshot=await db.transaction(async sql=>{
 await sql.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
 const [time]=await sql.query<{captured_at:string}>('SELECT transaction_timestamp() AS captured_at');
 const migrations=await sql.query('SELECT name,checksum FROM schema_migration ORDER BY name');
 const accounts=await sql.query('SELECT role,count(*)::integer AS count FROM app_user GROUP BY role ORDER BY role');
 const mentors=await sql.query('SELECT publication_status,count(*)::integer AS count FROM mentor_profile GROUP BY publication_status ORDER BY publication_status');
 const games=await sql.query('SELECT status,count(*)::integer AS count FROM quiz_game GROUP BY status ORDER BY status');
 const versions=await sql.query('SELECT status,count(*)::integer AS count FROM quiz_question_version GROUP BY status ORDER BY status');
 const durableTables=['app_user','consent','mentor_profile','mentoring_request','mentoring_program','message_conversation','private_message','conversation_read','user_block','message_report','mentoring_session','mentoring_objective','participation_attestation','game_category','quiz_question','quiz_question_version','quiz_game','game_question','editorial_quiz_batch','audit_event'];
 const durableDigests=[];
 for(const table of durableTables){const [row]=await sql.query<{count:number;digest:string}>(`SELECT count(*)::integer AS count,md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text),'')) AS digest FROM ${table} t`);durableDigests.push({table,...row})}
 const [fingerprints]=await sql.query(`SELECT
 (SELECT md5(coalesce(string_agg(id::text||':'||status,',' ORDER BY id),'')) FROM quiz_game) AS games,
 (SELECT md5(coalesce(string_agg(id::text||':'||status,',' ORDER BY id),'')) FROM quiz_question_version) AS questions,
 (SELECT md5(coalesce(string_agg(slug||':'||content_hash,',' ORDER BY slug),'')) FROM editorial_quiz_batch) AS editorial`);
 return {capturedAt:time.captured_at,checks:{migrations,accounts,mentors,games,versions,fingerprints,durableDigests}};
 });await mkdir('.local',{recursive:true});
 if(mode==='capture'){await writeFile('.local/recovery-source-baseline.json',JSON.stringify({sourceEndpoint,snapshot},null,2),{mode:0o600});console.log(JSON.stringify({mode,readOnly:true,capturedAt:snapshot.capturedAt,migrations:snapshot.checks.migrations.length,games:snapshot.checks.games,versions:snapshot.checks.versions,baselineFile:'.local/recovery-source-baseline.json'}));}
 else{const original=JSON.parse(await readFile('.local/recovery-source-baseline.json','utf8'));assert.equal(original.sourceEndpoint,sourceEndpoint,'Baseline belongs to another source endpoint');const matches=JSON.stringify(original.snapshot.checks)===JSON.stringify(snapshot.checks);await writeFile('.local/recovery-comparison.json',JSON.stringify({comparedAt:new Date().toISOString(),baselineTime:original.snapshot.capturedAt,targetReadOnly:true,sourceAndTargetDistinct:true,selectedChecksMatch:matches,providerRecoveryProvenanceStillRequired:true},null,2));assert.ok(matches,'Recovered controls differ; inspect privately before validating recovery');console.log('Contrôles sélectionnés identiques sur un endpoint distinct. La preuve du point historique et de la branche Neon reste à vérifier.');}
}catch(e){console.error(e instanceof assert.AssertionError?e.message:'Lecture de récupération indisponible. Aucun identifiant ni secret affiché.');process.exitCode=1}finally{await db.close()}
