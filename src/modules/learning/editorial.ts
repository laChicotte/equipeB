import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Database} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {MentoringService} from '../mentoring/service.ts';
import {AuthError} from '../identity/errors.ts';
import {starterGuides,starterRights} from './starter-guides.ts';
export class LibraryEditorialService {
 db:Database;
 constructor(db:Database){this.db=db}
 async preview(account:Account|null){return this.db.transaction(async sql=>{await new MentoringService(this.db).actor(sql,account,'admin');return {items:starterGuides,rights:starterRights}})}
 async submit(account:Account|null,input:unknown){z.strictObject({reviewRequired:z.literal(true)}).parse(input);return this.db.transaction(async sql=>{
  const user=await new MentoringService(this.db).actor(sql,account,'admin');let created=0;
  for(const guide of [...starterGuides].sort((a,b)=>a.key.localeCompare(b.key))){
   await sql.query('SELECT pg_advisory_xact_lock(hashtext($1))',['library-editorial:'+guide.key]);
   const hash=createHash('sha256').update(JSON.stringify({guide,rights:starterRights})).digest('hex');
   const [old]=await sql.query<{editorial_hash:string}>('SELECT editorial_hash FROM library_resource WHERE editorial_key=$1',[guide.key]);
   if(old){if(old.editorial_hash!==hash)throw new AuthError(409,'editorial_conflict','Le contenu du lot a changé : une nouvelle version est nécessaire.');continue}
   const [resource]=await sql.query<{id:string}>(`INSERT INTO library_resource(author_id,title,summary,category,kind,body,source_url,rights,editorial_key,editorial_hash,imported_by) VALUES(NULL,$1,$2,$3,'guide',$4,$5,$6,$7,$8,$9) RETURNING id`,[guide.title,guide.summary,guide.category,guide.body,guide.sourceUrl,starterRights,guide.key,hash,user.id]);
   await sql.query("INSERT INTO audit_event(actor_id,action,resource_type,resource_id) VALUES($1,'library.editorial.submitted','library',$2)",[user.id,resource.id]);created++;
  }
  return {created,message:created+' guide(s) ajouté(s) à la file de relecture. Aucun contenu publié.'};
 })}
}
