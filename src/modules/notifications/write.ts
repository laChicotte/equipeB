import type {Sql} from '../../server/database.ts';
type NoticeHref='/bibliotheque/'|'/communaute/'|'/compte/progression/'|'/compte/profil-mentor/'|'/compte/contributions/'|'/play/';
export async function writeNotice(sql:Sql,recipient:string|null,actor:string,body:string,href:NoticeHref){
 if(!recipient||recipient===actor)return;
 await sql.query('INSERT INTO learning_notice(user_id,body,href) VALUES($1,$2,$3)',[recipient,body,href]);
}
