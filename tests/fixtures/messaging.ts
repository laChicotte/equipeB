import type {Database} from '../../src/server/database.ts';
import type {Account} from '../../src/modules/identity/access.ts';
import {MentoringService} from '../../src/modules/mentoring/service.ts';
// Isolated test/demo data only. Never commit these simulated approvals in the user's database.
export async function seedMessagingFixture(db:Database,passwordHash='unused-synthetic-hash'){
 async function user(role:Account['role'],email:string){const [u]=await db.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at,adult_declared_at,adult_access_approved_at) VALUES($1,$2,$3,now(),now(),now()) RETURNING id`,[email,passwordHash,role]);return {id:u.id,email,role,emailVerified:true,adultAccessApproved:true} as Account}
 const admin=await user('admin','admin-messaging@example.invalid'),moderator=await user('moderator','moderation-messaging@example.invalid'),mentor=await user('mentor','mentor-messaging@example.invalid'),mentee=await user('mentee','mentee-messaging@example.invalid'),other=await user('mentee','other-messaging@example.invalid');
 await db.query("INSERT INTO mentor_profile(user_id,public_name,verification_status,publication_status,verified_by,verified_at) VALUES($1,'Mentor de démonstration','verified','published',$2,now())",[mentor.id,admin.id]);
 const service=new MentoringService(db,true);const request=await service.createRequest(mentee,{mentorId:mentor.id,goal:'Accompagnement synthétique réservé aux essais de messagerie.'});await service.transition(mentor,{id:request.id,status:'accepted'});
 const [program]=await db.query<{id:string}>('SELECT id FROM mentoring_program WHERE request_id=$1',[request.id]);return {admin,moderator,mentor,mentee,other,programId:program.id};
}
