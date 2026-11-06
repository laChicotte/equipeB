import {randomUUID} from 'node:crypto';
import {ZodError} from 'zod';
import {authConfig,currentToken,body} from './auth-http.ts';
import type {AuthConfig} from './auth-http.ts';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {IdentityService} from '../modules/identity/service.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {PlanningService} from '../modules/planning/service.ts';
export function planningFlags(env:Record<string,string|undefined>=process.env){
 const enabled=env.PLANNING_ENABLED==='true'&&(env.NODE_ENV!=='production'||env.PRIVATE_COMMUNICATIONS_APPROVED==='true');
 return {enabled,sendEnabled:enabled&&env.MENTORING_ENABLED==='true'};
}
type Dependencies={db:()=>Promise<Database>;config:()=>AuthConfig;flags:()=>{enabled:boolean;sendEnabled:boolean};account:(request:Request,config:AuthConfig,db:Database)=>Promise<Account|null>};
const defaults:Dependencies={db:getDatabase,config:authConfig,flags:planningFlags,account:async(request,config,db)=>new IdentityService(db,{async send(){}},config.origin,config.secret).account(currentToken(request,config))};
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...headers}});
export async function handlePlanning(request:Request,action:string,deps:Dependencies=defaults){
 try{
  const flags=deps.flags(),url=new URL(request.url),method=request.method;
  if(action==='config'&&method==='GET')return json(flags);
  const getActions=['programs','board'],postActions=['propose','session-action','objective','objective-action'];
  if(![...getActions,...postActions].includes(action))return json({message:'Action introuvable.'},404);
  if((method==='GET'&&!getActions.includes(action))||(method==='POST'&&!postActions.includes(action))||!['GET','POST'].includes(method))return json({message:'Méthode non autorisée.'},405);
  const config=deps.config();
  if(method==='POST'&&(request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
  if(!flags.enabled)throw new AuthError(403,'planning_closed','Les échanges privés ne sont pas encore ouverts.');
  const db=await deps.db(),account=await deps.account(request,config,db);
  if(!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
  const service=new PlanningService(db,flags.enabled,flags.sendEnabled);
  if(method==='GET')return action==='programs'?json({items:await service.programs(account)}):json(await service.board(account,Object.fromEntries(url.searchParams)));
  await new IdentityService(db,{async send(){}},config.origin,config.secret).rate('planning-'+action,account.id,30);
  const input=await body(request);
  if(action==='propose')return json(await service.propose(account,input),201);
  if(action==='session-action')return json(await service.sessionAction(account,input));
  if(action==='objective')return json(await service.objective(account,input),201);
  return json(await service.objectiveAction(account,input));
 }catch(error){
  if(error instanceof AuthError)return json({code:error.code,message:error.message},error.status,error.status===429?{'Retry-After':'900'}:{});
  if(error instanceof ZodError)return json({code:'validation_failed',message:'Vérifiez les champs du formulaire.'},400);
  console.error('talentlink_planning_error',randomUUID());return json({message:'Le service est temporairement indisponible.'},503);
 }
}
