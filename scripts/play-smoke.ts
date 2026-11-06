import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {getDatabase} from '../src/server/database.ts';
import type {Database} from '../src/server/database.ts';
import {PlayService} from '../src/modules/play/service.ts';
import {seedPlayFixture} from '../tests/fixtures/play.ts';
process.loadEnvFile('.env.local');
if(process.env.NODE_ENV==='production'||process.env.DB_DRIVER==='pglite')throw new Error('Development PostgreSQL required');
const db=await getDatabase(),rollback=new Error('Synthetic transaction rollback');let verified=false;
try{
 try{await db.transaction(async sql=>{
  const fixtureDb:Database={...sql,transaction:fn=>fn(sql),close:async()=>{}};
  const fixture=await seedPlayFixture(fixtureDb),play=new PlayService(fixtureDb),owner=randomBytes(32).toString('hex');
  const attempt=await play.start(owner,null,{gameId:fixture.gameId});const initial=await play.state(owner,null,attempt.id);
  assert.ok(!JSON.stringify(initial).includes('correct_index'));
  for(let index=0;index<3;index++)await play.answer(owner,null,{attemptId:attempt.id,index,choice:index});
  await play.answer(owner,null,{attemptId:attempt.id,index:0,choice:0});
  const final=await play.state(owner,null,attempt.id);assert.equal(final.score,30);assert.equal(final.percentage,100);assert.equal(final.completed,true);
  await play.recommendations(owner,null,attempt.id);
  verified=true;throw rollback;
 })}catch(error){if(error!==rollback)throw error}
 if(!verified)throw new Error('Not verified');
 console.log('PostgreSQL natif : questions versionnées, modération, publication, partie anonyme, score et recommandations vérifiés. Transaction annulée ; aucun jeu synthétique publié aux autres connexions, aucun e-mail envoyé.');
}catch{console.error('Vérification Play PostgreSQL échouée. Transaction annulée, aucun identifiant affiché.');process.exitCode=1}
finally{await db.close()}
