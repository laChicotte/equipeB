import {z,ZodError} from 'zod';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {authConfig,currentToken,body} from './auth-http.ts';
import {IdentityService} from '../modules/identity/service.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {LibraryEditorialService} from '../modules/learning/editorial.ts';
import {ProgressService} from '../modules/learning/progress.ts';
import {LearningService} from '../modules/learning/service.ts';
type Dependencies={enabled:()=>boolean;db:()=>Promise<Database>;account:(r:Request,db:Database)=>Promise<Account|null>;origin:()=>string;secret:()=>string};
const defaults:Dependencies={enabled:()=>process.env.LEARNING_ENABLED==='true',db:getDatabase,secret:()=>authConfig().secret,origin:()=>authConfig().origin,account:async(r,db)=>{if(process.env.AUTH_ENABLED!=='true')return null;const c=authConfig();return new IdentityService(db,{async send(){}},c.origin,c.secret).account(currentToken(r,c))}};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function handleLearning(request:Request,action:string,deps:Dependencies=defaults){try{
 if(action==='config'&&request.method==='GET')return json({enabled:deps.enabled()});
 if(!deps.enabled())return json({message:'Cet espace n’est pas activé sur cet environnement.'},503);
 const reads=['starter-guides','resources','resource','profile','dashboard','feed','queue','goal-detail'],writes=['starter-guides','resource','favorite','profile','goal','read-notice','post','react','follow','review','step','step-complete','goal-review'];
 if(!['GET','POST'].includes(request.method))return json({message:'Méthode non autorisée.'},405);
 if(!(request.method==='GET'?reads:writes).includes(action))return json({message:'Action introuvable.'},404);
 if(request.method==='POST'&&(request.headers.get('origin')!==deps.origin()||request.headers.get('sec-fetch-site')==='cross-site'))return json({message:'Origine non autorisée.'},403);
 const db=await deps.db(),service=new LearningService(db),url=new URL(request.url);
 const account=await deps.account(request,db);
 if(!(request.method==='GET'&&['resources','resource'].includes(action))&&!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
 if(request.method==='GET'){
  if(action==='starter-guides'){z.strictObject({}).parse(Object.fromEntries(url.searchParams));return json(await new LibraryEditorialService(db).preview(account))}
  if(action==='resources')return json(await service.resources(account,Object.fromEntries(url.searchParams)));
  if(action==='resource')return json(await service.resource(z.uuid().parse(url.searchParams.get('id'))));
  if(action==='profile')return json(await service.profile(account));
  if(action==='goal-detail')return json(await new ProgressService(db).detail(account,z.uuid().parse(url.searchParams.get('id'))));
  if(action==='dashboard')return json(await service.dashboard(account));
  if(action==='feed')return json(await service.feed(account,Object.fromEntries(url.searchParams)));
  if(action==='queue')return json(await service.queue(account));
 }else{
  const limiter=new IdentityService(db,{async send(){}},deps.origin(),deps.secret());
  await limiter.rate('learning-write',account!.id,60);
  const input=await body(request);
  if(action==='starter-guides')return json(await new LibraryEditorialService(db).submit(account,input),201);
  if(action==='resource')return json(await service.submitResource(account,input),201);
  if(action==='profile')return json(await service.saveProfile(account,input));
  if(action==='favorite')return json(await service.favorite(account,input));
  if(action==='step')return json(await new ProgressService(db).step(account,input),201);
  if(action==='step-complete')return json(await new ProgressService(db).complete(account,input));
  if(action==='goal-review')return json(await new ProgressService(db).review(account,input),201);
  if(action==='goal')return json(await service.goal(account,input));
  if(action==='read-notice')return json(await service.readNotice(account,input));
  if(action==='post')return json(await service.post(account,input),201);
  if(action==='react')return json(await service.react(account,input));
  if(action==='follow')return json(await service.follow(account,input));
  if(action==='review')return json(await service.review(account,input));
 }
 return json({message:'Action introuvable.'},404);
}catch(e){if(e instanceof AuthError)return json({message:e.message,code:e.code},e.status);if(e instanceof ZodError)return json({message:'Vérifiez les champs du formulaire.'},400);console.error('talentlink_learning_failed');return json({message:'Service indisponible. Réessayez.'},503)}}
