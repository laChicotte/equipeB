import {randomUUID} from 'node:crypto';
import {ZodError} from 'zod';
import type {Database} from './database.ts';
import type {Account} from '../modules/identity/access.ts';
import type {SprintGenerator} from '../modules/play/sprint.ts';
import {SprintService} from '../modules/play/sprint.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {IdentityService} from '../modules/identity/service.ts';
import {authConfig,currentToken,body} from './auth-http.ts';
import {getDatabase} from './database.ts';
import {generateSprint} from './sprint-ai.ts';

type Dependencies={env:Record<string,string|undefined>;db:()=>Promise<Database>;account:(request:Request,db:Database)=>Promise<Account|null>;generate:SprintGenerator};
const defaults:Dependencies={env:process.env,db:getDatabase,generate:generateSprint,account:async(request,db)=>{if(process.env.AUTH_ENABLED!=='true')return null;const c=authConfig();return new IdentityService(db,{async send(){}},c.origin,c.secret).account(currentToken(request,c))}};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...(status===429?{'Retry-After':'86400'}:{})}});
export async function handleSprint(request:Request,deps:Dependencies=defaults){
 try{
  const enabled=deps.env.PLAY_ENABLED==='true'&&deps.env.AI_SPRINT_ENABLED==='true'&&!!deps.env.AI_GATEWAY_MODEL;
  const url=new URL(request.url),action=url.searchParams.get('action')||'';
  if(request.method==='GET'){
   if(!action)return json({enabled,dailyPerAccount:3,dailyGlobal:30,questions:5});
   if(!['reports','review'].includes(action))return json({message:'Action introuvable.'},404);
   const db=await deps.db(),account=await deps.account(request,db),service=new SprintService(db,deps.generate,deps.env.AI_GATEWAY_MODEL||'');
   if(action==='review')return json(await service.review(account,url.searchParams.get('id')));
   return json(await service.reports(account,{status:url.searchParams.get('status')||'published',after:url.searchParams.get('after')||''}));
  }
  if(request.method!=='POST')return json({message:'Méthode non autorisée.'},405);
  if(!['','report','archive'].includes(action))return json({message:'Action introuvable.'},404);
  if(!enabled&&!['report','archive'].includes(action))throw new AuthError(503,'sprint_closed','Le mode Sprint IA n’est pas encore disponible.');
  if(request.headers.get('origin')!==new URL(deps.env.APP_URL!).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
  const db=await deps.db(),account=await deps.account(request,db);
  if(!account)throw new AuthError(401,'unauthenticated','Connecte-toi pour continuer.');
  const service=new SprintService(db,deps.generate,deps.env.AI_GATEWAY_MODEL!);
  const input=await body(request);
  if(action==='report')return json(await service.report(account,input));
  if(action==='archive')return json(await service.archive(account,input));
  return json(await service.create(account,input),201);
 }catch(error){
  if(error instanceof AuthError)return json({code:error.code,message:error.message},error.status);
  if(error instanceof ZodError)return json({code:'validation_failed',message:new URL(request.url).searchParams.get('action')?'Vérifie le jeu, le motif, les filtres ou la confirmation demandée.':'Choisis un sujet général, une catégorie et un niveau, puis accepte la publication publique.'},400);
  console.error('talentlink_sprint_error',randomUUID());return json({message:'Le service est temporairement indisponible.'},503);
 }
}
