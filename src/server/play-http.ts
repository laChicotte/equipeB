import {PlayProgressService} from '../modules/play/progress.ts';
import {ContributionProgressService} from '../modules/play/contribution-progress.ts';
import {randomUUID} from 'node:crypto';
import {z,ZodError} from 'zod';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {authConfig,currentToken,body} from './auth-http.ts';
import {IdentityService} from '../modules/identity/service.ts';
import {createToken} from '../modules/identity/crypto.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {PlayService} from '../modules/play/service.ts';
export type PlayConfig={origin:string;secure:boolean;secret:string;enabled:boolean};
export function playConfig():PlayConfig{
 if(process.env.PLAY_ENABLED!=='true'&&!process.env.APP_URL)return {origin:'',secure:process.env.NODE_ENV==='production',secret:process.env.AUTH_SECRET||'',enabled:false};
 const url=new URL(process.env.APP_URL||'http://127.0.0.1:3000');
 if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!['http:','https:'].includes(url.protocol)||(url.protocol!=='https:'&&(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new Error('Invalid origin');
 const secret=process.env.AUTH_SECRET||'';
 if(process.env.PLAY_ENABLED==='true'&&(secret.length<32||/replace|change-me/i.test(secret)))throw new Error('Missing secret');
 return {origin:url.origin,secure:url.protocol==='https:',secret,enabled:process.env.PLAY_ENABLED==='true'};
}
type Dependencies={resourcesEnabled?:()=>boolean;db:()=>Promise<Database>;config:()=>PlayConfig;account:(request:Request,db:Database)=>Promise<Account|null>};
const defaults:Dependencies={resourcesEnabled:()=>process.env.LEARNING_ENABLED==='true',db:getDatabase,config:playConfig,account:async(request,db)=>{
 if(process.env.AUTH_ENABLED!=='true')return null;
 const config=authConfig();return new IdentityService(db,{async send(){}},config.origin,config.secret).account(currentToken(request,config));
}};
const json=(value:unknown,status=200,headers:Record<string,string>={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
export async function handlePlay(request:Request,action:string,deps:Dependencies=defaults){
 try{
  const c=deps.config(),url=new URL(request.url),method=request.method;
  if(action==='config'&&method==='GET')return json({enabled:c.enabled});
  const publicActions=['catalog','categories','start','state','answer','recommendations','mentor-click'];
  if(![...publicActions,'questions','question','submit-question','review-question','games','game','submit-game','review-game','category','history','progress','contribution-progress','stats'].includes(action))return json({message:'Action introuvable.'},404);
  if(!['GET','POST'].includes(method))return json({message:'Méthode non autorisée.'},405);
  if(action==='progress'||action==='contribution-progress'){
   if(method!=='GET')return json({message:'Méthode non autorisée.'},405);
   z.object({}).strict().parse(Object.fromEntries(url.searchParams));
  }
  if(publicActions.includes(action)&&action!=='categories'&&!c.enabled)throw new AuthError(503,'play_closed','Les quiz ne sont pas encore ouverts sur cet environnement.');
  if(method==='POST'&&(request.headers.get('origin')!==c.origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
  const db=await deps.db(),service=new PlayService(db);
  const account=await deps.account(request,db);
  if(!publicActions.includes(action)&&!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
  const cookieName=c.secure?'__Host-tl_play':'tl_play';
  const candidate=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  const owner=candidate&&/^[a-f0-9]{64}$/.test(candidate)?candidate:undefined;
  const id=()=>z.uuid().parse(url.searchParams.get('id'));
  if(method==='GET'){
   if(action==='categories')return json({items:await service.categories()});
   if(action==='catalog')return json(await service.catalog(Object.fromEntries(url.searchParams)));
   if(action==='state'||action==='recommendations'){if(!owner)throw new AuthError(404,'not_found','Partie introuvable dans ce navigateur.');return json(action==='state'?await service.state(owner,account,id()):await service.recommendations(owner,account,id(),false,deps.resourcesEnabled?.()??false))}
   if(action==='questions')return json({items:await service.questions(account)});
   if(action==='games')return json({items:await service.games(account)});
   if(action==='progress')return json(await new PlayProgressService(db).progress(account));
   if(action==='contribution-progress')return json(await new ContributionProgressService(db).progress(account));
   if(action==='history')return json({items:await service.history(account)});
   if(action==='stats')return json(await service.stats(account));
  }else{
   const limiter=new IdentityService(db,{async send(){}},c.origin,c.secret);
   await limiter.rate('play-global','all',2000);
   await limiter.rate('play-write',account?.id||owner||'new-browser',120);
   const input=await body(request);
   if(action==='start'){const token=owner||createToken();const result=await service.start(token,account,input);return json(result,201,{'Set-Cookie':cookieName+'='+token+'; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400'+(c.secure?'; Secure':'')})}
   if(action==='answer'||action==='mentor-click'){
    if(!owner)throw new AuthError(404,'not_found','Partie introuvable dans ce navigateur.');
    if(action==='answer')return json(await service.answer(owner,account,input));
    const v=z.object({id:z.uuid()}).strict().parse(input);return json(await service.recommendations(owner,account,v.id,true,deps.resourcesEnabled?.()??false));
   }
   if(action==='question')return json(await service.saveQuestion(account,input),201);
   if(action==='submit-question'){const v=z.object({id:z.uuid()}).strict().parse(input);return json(await service.submitQuestion(account,v.id))}
   if(action==='review-question')return json(await service.reviewQuestion(account,input));
   if(action==='game')return json(await service.createGame(account,input),201);
   if(action==='submit-game'){const v=z.object({id:z.uuid()}).strict().parse(input);return json(await service.submitGame(account,v.id))}
   if(action==='review-game'){const v=z.object({id:z.uuid(),publish:z.boolean()}).strict().parse(input);return json(await service.reviewGame(account,v.id,v.publish))}
   if(action==='category')return json(await service.category(account,input));
  }
  return json({message:'Méthode non autorisée.'},405);
 }catch(error){
  if(error instanceof AuthError)return json({code:error.code,message:error.message},error.status,error.status===429?{'Retry-After':'900'}:{});
  if(error instanceof ZodError)return json({code:'validation_failed',message:'Vérifiez les champs : '+[...new Set(error.issues.map(i=>String(i.path[0]||'formulaire')))].join(', ')+'.'},400);
  console.error('talentlink_play_error',randomUUID());return json({message:'Le service est temporairement indisponible.'},503);
 }
}
