import type {Database} from '../../src/server/database.ts';
import type {Account} from '../../src/modules/identity/access.ts';
import {PlayService} from '../../src/modules/play/service.ts';
// Synthetic fixture. Call only with an isolated embedded database, never the user's PostgreSQL.
export async function seedPlayFixture(db:Database){
 async function admin(){const [u]=await db.query<{id:string}>(`INSERT INTO app_user(email,password_hash,role,email_verified_at) VALUES(gen_random_uuid()||'@example.invalid','synthetic-unused','admin',now()) RETURNING id`);return {id:u.id,role:'admin',email:'synthetic@example.invalid',emailVerified:true,adultAccessApproved:false} as Account}
 const author=await admin(),reviewer=await admin(),play=new PlayService(db);
 const [category]=await db.query<{id:string}>("SELECT id FROM game_category WHERE name='Sciences'");const ids:string[]=[];
 for(const [stem,options,correctIndex,explanation] of [
  ['Combien font deux plus deux ?',['4','5','6'],0,'Deux unités ajoutées à deux unités donnent quatre unités.'],
  ['Combien font trois plus trois ?',['5','6','7'],1,'En réunissant deux groupes de trois unités, on obtient six unités.'],
  ['Combien font quatre plus quatre ?',['6','7','8'],2,'En réunissant deux groupes de quatre unités, on obtient huit unités.'],
 ] as const){const q=await play.saveQuestion(author,{categoryId:category.id,level:'beginner',stem,options:[...options],correctIndex,explanation,source:''});await play.submitQuestion(author,q.id);await play.reviewQuestion(reviewer,{id:q.id,decision:'approved',note:'Validation simulée uniquement dans une base de démonstration isolée.'});ids.push(q.id)}
 const g=await play.createGame(author,{title:'Démonstration — premiers calculs',description:'Jeu fictif réservé aux essais locaux. Il ne fait pas partie du catalogue public de TalentLink.',categoryId:category.id,level:'beginner',durationMinutes:2,pointsPerAnswer:10,questionIds:ids});
 await play.submitGame(author,g.id);await play.reviewGame(reviewer,g.id,true);return {gameId:g.id,categoryId:category.id};
}
