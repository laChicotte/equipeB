import {z} from 'zod';
import type {Database} from '../../server/database.ts';
import type {Account} from '../identity/access.ts';
import {MentoringService} from '../mentoring/service.ts';
import {AuthError} from '../identity/errors.ts';
const inboxInput=z.object({filter:z.enum(['all','unread']).default('all'),before:z.iso.datetime({offset:true}).optional(),beforeId:z.uuid().optional()}).strict().refine(v=>Boolean(v.before)===Boolean(v.beforeId));
const readInput=z.object({ids:z.array(z.uuid().transform(v=>v.toLowerCase())).min(1).max(20).refine(v=>new Set(v).size===v.length)}).strict();
type Notice={id:string;body:string;href:string;read_at:string|null;created_at:string};
export class NotificationService{
 db:Database;
 constructor(db:Database){this.db=db}
 async count(account:Account|null){return this.db.transaction(async sql=>{
  const user=await new MentoringService(this.db).actor(sql,account);
  const [row]=await sql.query<{unread:number}>('SELECT count(*)::integer AS unread FROM learning_notice WHERE user_id=$1 AND read_at IS NULL',[user.id]);return row;
 })}
 async inbox(account:Account|null,input:unknown){const v=inboxInput.parse(input);return this.db.transaction(async sql=>{
  const user=await new MentoringService(this.db).actor(sql,account);
  const rows=await sql.query<Notice>(`SELECT id,body,href,read_at,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
   FROM learning_notice WHERE user_id=$1 AND ($2='all' OR read_at IS NULL)
   AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT 21`,[user.id,v.filter,v.before||null,v.beforeId||null]);
  const [count]=await sql.query<{unread:number}>('SELECT count(*)::integer AS unread FROM learning_notice WHERE user_id=$1 AND read_at IS NULL',[user.id]);
  const items=rows.slice(0,20),last=items.at(-1);return {items,unread:count.unread,next:rows.length>20&&last?{before:last.created_at,beforeId:last.id}:null};
 })}
 async read(account:Account|null,input:unknown){const v=readInput.parse(input);return this.db.transaction(async sql=>{
  const user=await new MentoringService(this.db).actor(sql,account);
  const rows=await sql.query<{id:string}>('SELECT id FROM learning_notice WHERE user_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE',[user.id,v.ids]);
  if(rows.length!==v.ids.length)throw new AuthError(404,'not_found','Une notification n’est pas disponible dans ton espace.');
  await sql.query('UPDATE learning_notice SET read_at=coalesce(read_at,now()) WHERE user_id=$1 AND id=ANY($2::uuid[])',[user.id,v.ids]);
  return {message:v.ids.length===1?'Notification marquée comme lue.':'Les notifications affichées sont marquées comme lues.'};
 })}
}
