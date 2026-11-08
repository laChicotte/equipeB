import {z,ZodError} from 'zod';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {authConfig,currentToken,body} from './auth-http.ts';
import type {AuthConfig} from './auth-http.ts';
import {IdentityService} from '../modules/identity/service.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {NotificationService} from '../modules/notifications/service.ts';
type Dependencies={db:()=>Promise<Database>;config:()=>AuthConfig;account:(request:Request,db:Database,config:AuthConfig)=>Promise<Account|null>};
const defaults:Dependencies={db:getDatabase,config:authConfig,account:async(r,db,c)=>{if(process.env.AUTH_ENABLED!=='true')return null;return new IdentityService(db,{async send(){}},c.origin,c.secret).account(currentToken(r,c))}};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function handleNotifications(request:Request,action:'inbox'|'count',deps:Dependencies=defaults){try{
 if(!['GET','POST'].includes(request.method)||(action==='count'&&request.method!=='GET'))return json({message:'Méthode non autorisée.'},405);
 const c=deps.config();
 if(request.method==='POST'&&(request.headers.get('origin')!==c.origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
 const db=await deps.db(),account=await deps.account(request,db,c);if(!account)throw new AuthError(401,'unauthenticated','Connecte-toi pour consulter tes notifications.');
 const service=new NotificationService(db);
 if(request.method==='GET'){
  const input=Object.fromEntries(new URL(request.url).searchParams);
  if(action==='count'){z.object({}).strict().parse(input);return json(await service.count(account))}
  return json(await service.inbox(account,input));
 }
 await new IdentityService(db,{async send(){}},c.origin,c.secret).rate('notices-read',account.id,60);
 return json(await service.read(account,await body(request)));
}catch(error){
 if(error instanceof AuthError)return json({code:error.code,message:error.message},error.status);
 if(error instanceof ZodError)return json({message:'Vérifie le filtre, la page ou les notifications sélectionnées.'},400);
 console.error('talentlink_notifications_failed');return json({message:'Les notifications sont momentanément indisponibles.'},503);
}}
