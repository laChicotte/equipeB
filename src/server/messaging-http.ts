import {randomUUID} from 'node:crypto';
import {ZodError} from 'zod';
import {authConfig,currentToken,body} from './auth-http.ts';
import type {AuthConfig} from './auth-http.ts';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {IdentityService} from '../modules/identity/service.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {MessagingService} from '../modules/messaging/service.ts';
export function messagingFlags(env:Record<string,string|undefined>=process.env){
 const enabled=env.MESSAGING_ENABLED==='true'&&(env.NODE_ENV!=='production'||env.PRIVATE_COMMUNICATIONS_APPROVED==='true');
 return {enabled,sendEnabled:enabled&&env.MENTORING_ENABLED==='true'};
}
type Dependencies={db:()=>Promise<Database>;config:()=>AuthConfig;flags:()=>{enabled:boolean;sendEnabled:boolean};account:(request:Request,config:AuthConfig,db:Database)=>Promise<Account|null>};
const defaults:Dependencies={db:getDatabase,config:authConfig,flags:messagingFlags,account:async(request,config,db)=>new IdentityService(db,{async send(){}},config.origin,config.secret).account(currentToken(request,config))};
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...headers}});
export async function handleMessaging(request:Request,action:string,deps:Dependencies=defaults){
 try{
  const flags=deps.flags(),url=new URL(request.url),method=request.method;
  if(action==='config'&&method==='GET')return json(flags);
  if(!['conversations','messages','send','read','block','report','reports','moderate'].includes(action))return json({message:'Action introuvable.'},404);
  const getActions=['conversations','messages','reports'],postActions=['send','read','block','report','moderate'];
  if((method==='GET'&&!getActions.includes(action))||(method==='POST'&&!postActions.includes(action))||!['GET','POST'].includes(method))return json({message:'Méthode non autorisée.'},405);
  const config=deps.config();
  if(method==='POST'&&(request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
  if(!flags.enabled&&!['block','report','reports','moderate'].includes(action))throw new AuthError(403,'messaging_closed','Les échanges privés ne sont pas encore ouverts.');
  const db=await deps.db(),account=await deps.account(request,config,db);
  if(!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
  const service=new MessagingService(db,flags.enabled,flags.sendEnabled);
  if(method==='GET'){
   if(action==='conversations')return json({items:await service.conversations(account)});
   if(action==='messages')return json(await service.messages(account,Object.fromEntries(url.searchParams)));
   return json({items:await service.reports(account)});
  }
  const limiter=new IdentityService(db,{async send(){}},config.origin,config.secret);
  await limiter.rate('messaging-'+action,account.id,action==='send'?60:30);
  const input=await body(request);
  if(action==='send')return json(await service.send(account,input),201);
  if(action==='read')return json(await service.read(account,input));
  if(action==='block')return json(await service.block(account,input));
  if(action==='report')return json(await service.report(account,input),202);
  return json(await service.moderate(account,input));
 }catch(error){
  if(error instanceof AuthError)return json({code:error.code,message:error.message},error.status,error.status===429?{'Retry-After':'900'}:{});
  if(error instanceof ZodError)return json({code:'validation_failed',message:'Vérifiez les champs du formulaire.'},400);
  console.error('talentlink_messaging_error',randomUUID());return json({message:'Le service est temporairement indisponible.'},503);
 }
}
