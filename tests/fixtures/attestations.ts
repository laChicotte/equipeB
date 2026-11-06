import {randomUUID} from 'node:crypto';
import type {Database} from '../../src/server/database.ts';
import {seedMessagingFixture} from './messaging.ts';
import {PlanningService} from '../../src/modules/planning/service.ts';
import {MentoringService} from '../../src/modules/mentoring/service.ts';
export async function seedAttestationFixture(db:Database,passwordHash?:string){
 const f=await seedMessagingFixture(db,passwordHash,'attestations'),planning=new PlanningService(db,true,true);
 const session=await planning.propose(f.mentor,{programId:f.programId,clientId:randomUUID(),title:'Séance synthétique pour les attestations',startsAt:new Date(Date.now()+86400000).toISOString(),durationMinutes:45});
 await planning.sessionAction(f.mentee,{programId:f.programId,id:session.id,revision:1,action:'confirm'});
 // Simulate elapsed time only in isolated tests or an explicitly rolled-back transaction.
 await db.query("UPDATE mentoring_program SET created_at=now()-interval '3 days' WHERE id=$1",[f.programId]);
 await db.query("UPDATE mentoring_session SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1",[session.id]);
 await planning.sessionAction(f.mentor,{programId:f.programId,id:session.id,revision:2,action:'complete'});
 await new MentoringService(db,true).updateProgram(f.mentor,{id:f.programId,status:'completed',goal:'Accompagnement synthétique réservé aux essais des attestations.'});return f;
}
