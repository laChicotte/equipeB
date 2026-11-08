import {randomUUID} from 'node:crypto';
import {z,ZodError} from 'zod';
import {authConfig,currentToken,body} from './auth-http.ts';
import {getDatabase} from './database.ts';
import {IdentityService} from '../modules/identity/service.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {MentoringService} from '../modules/mentoring/service.ts';
import type {Database} from './database.ts';
import type {AuthConfig} from './auth-http.ts';
import type {Account} from '../modules/identity/access.ts';
type Dependencies={db:()=>Promise<Database>;config:()=>AuthConfig;account:(request:Request,config:AuthConfig,db:Database)=>Promise<Account|null>;enabled:()=>boolean};
const defaults:Dependencies={db:getDatabase,config:authConfig,enabled:()=>process.env.MENTORING_ENABLED==='true',account:async(request,config,db)=>new IdentityService(db,{async send(){throw new Error('Mail not used')}},config.origin,config.secret).account(currentToken(request,config))};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function handleMentoring(request:Request,action:string,deps:Dependencies=defaults){
 try{
  const url=new URL(request.url);const method=request.method;
  if(action==='config'&&method==='GET')return json({requestsEnabled:deps.enabled()});
  if(!['directory','profile','own-profile','submit','reviews','review','requests','request','transition','programs','program','favorite','favorites'].includes(action))return json({message:'Action introuvable.'},404);
  const publicRead=method==='GET'&&['directory','profile'].includes(action);
  if(!publicRead&&!['GET','POST'].includes(method))return json({message:'Méthode non autorisée.'},405);
  const config=publicRead?null:deps.config();
  if(method==='POST'&&(!config||request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
  const db=await deps.db();const service=new MentoringService(db,deps.enabled());
  if(publicRead){
   if(action==='directory')return json(await service.search(Object.fromEntries(url.searchParams)));
   return json({profile:await service.detail(z.uuid().parse(url.searchParams.get('id')))});
  }
  const account=await deps.account(request,config!,db);
  if(!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
  if(method==='GET'){
   if(action==='own-profile')return json({profile:await service.own(account)});
   if(action==='reviews')return json({items:await service.queue(account)});
   if(action==='requests')return json({items:await service.requests(account)});
   if(action==='programs')return json({items:await service.programs(account)});
   if(action==='favorites')return json({items:await service.favorites(account)});
  }else if(method==='POST'){
   const limiter=new IdentityService(db,{async send(){}},config!.origin,config!.secret);
   await limiter.rate('mentoring-write',account.id,30);
   const input=await body(request);
   if(action==='own-profile')return json(await service.save(account,input));
   if(action==='submit'){const v=z.object({revision:z.number().int().positive()}).strict().parse(input);return json(await service.submit(account,v.revision))}
   if(action==='review')return json(await service.review(account,input));
   if(action==='request')return json(await service.createRequest(account,input),201);
   if(action==='transition')return json(await service.transition(account,input));
   if(action==='program')return json(await service.updateProgram(account,input));
   if(action==='favorite'){const v=z.object({id:z.uuid(),add:z.boolean()}).strict().parse(input);return json(await service.favorite(account,v.id,v.add))}
  }
  return json({message:'Méthode non autorisée.'},405);
 }catch(error){
  if(error instanceof AuthError)return json({code:error.code,message:error.message},error.status);
  if(error instanceof ZodError){
   if(error.issues.some(i=>i.path[0]==='weeklySlots'))return json({code:'validation_failed',message:'Vérifiez les créneaux : jours valides, horaires par quarts d’heure, durée de 15 minutes à 12 heures et aucun chevauchement le même jour.'},400);
   if(error.issues.some(i=>i.path[0]==='availabilityTimezone'))return json({code:'validation_failed',message:'Choisissez un fuseau horaire valide, par exemple Africa/Conakry ou Europe/Paris.'},400);
   return json({code:'validation_failed',message:'Vérifiez les champs : '+[...new Set(error.issues.map(i=>String(i.path[0]||'formulaire')))].join(', ')+'.'},400);
  }
  console.error('talentlink_mentoring_error',randomUUID());return json({message:'Le service est temporairement indisponible.'},503);
 }
}
