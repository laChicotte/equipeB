import {randomUUID} from 'node:crypto';
import {ZodError} from 'zod';
import {authConfig,currentToken,registrationEnabled} from './auth-http.ts';
import type {AuthConfig} from './auth-http.ts';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {IdentityService} from '../modules/identity/service.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {AdministrationService} from '../modules/administration/service.ts';
type Dependencies={db:()=>Promise<Database>;config:()=>AuthConfig;account:(request:Request,config:AuthConfig,db:Database)=>Promise<Account|null>;env:Record<string,string|undefined>};
const defaults:Dependencies={db:getDatabase,config:authConfig,account:async(r,c,db)=>new IdentityService(db,{async send(){}},c.origin,c.secret).account(currentToken(r,c)),env:process.env};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function handleAdministration(request:Request,action:string,deps:Dependencies=defaults){
 try{
  if(request.method!=='GET')return json({message:'Méthode non autorisée.'},405);
  if(!['overview','audit'].includes(action))return json({message:'Action introuvable.'},404);
  const config=deps.config(),db=await deps.db(),account=await deps.account(request,config,db),service=new AdministrationService(db);
  if(action==='audit')return json(await service.audit(account,Object.fromEntries(new URL(request.url).searchParams)));
  const data=await service.overview(account);const approved=deps.env.NODE_ENV!=='production'||deps.env.PRIVATE_COMMUNICATIONS_APPROVED==='true';
  return json({...data,features:{adultRegistrations:registrationEnabled(deps.env),attestations:deps.env.ATTESTATIONS_ENABLED==='true'&&(deps.env.NODE_ENV!=='production'||deps.env.ATTESTATIONS_APPROVED==='true'),mentoring:deps.env.MENTORING_ENABLED==='true',messaging:deps.env.MESSAGING_ENABLED==='true'&&approved,planning:deps.env.PLANNING_ENABLED==='true'&&approved,play:deps.env.PLAY_ENABLED==='true'}});
 }catch(e){
  if(e instanceof AuthError)return json({code:e.code,message:e.message},e.status);
  if(e instanceof ZodError)return json({message:'Filtres invalides.'},400);
  console.error('talentlink_administration_error',randomUUID());return json({message:'Le tableau de bord est temporairement indisponible.'},503);
 }
}
