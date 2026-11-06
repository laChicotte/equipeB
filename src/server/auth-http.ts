import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { getDatabase } from './database.ts';
import { mailer } from './mail.ts';
import { IdentityService, SESSION_SECONDS } from '../modules/identity/service.ts';
import { AuthError } from '../modules/identity/errors.ts';
import { requirePermission } from '../modules/identity/access.ts';
import {smtpSettings} from './smtp-settings.ts';

export type AuthConfig={origin:string;secure:boolean;registrationEnabled:boolean;secret:string};
export function registrationEnabled(env:Record<string,string|undefined>=process.env){return env.AUTH_REGISTRATION_ENABLED==='true'&&(env.NODE_ENV!=='production'||env.ADULT_REGISTRATION_APPROVED==='true')}
export function authConfig():AuthConfig {
  if(process.env.AUTH_ENABLED!=='true') throw new AuthError(503,'auth_disabled','Les comptes ne sont pas encore ouverts.');
  const url=new URL(process.env.APP_URL || 'http://127.0.0.1:3000');
  const secure=url.protocol==='https:';
  if(url.username || url.password || url.pathname!=='/' || url.search || url.hash ||
    (!secure && (process.env.NODE_ENV==='production' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname)))) throw new Error('Invalid APP_URL');
  const secret=process.env.AUTH_SECRET || '';
  if(secret.length<32 || /replace|change-me/i.test(secret)) throw new Error('AUTH_SECRET is not configured');
  if(process.env.DB_DRIVER!=='pglite'&&!/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL||''))throw new Error('PostgreSQL is not configured');
  if(process.env.NODE_ENV==='production'&&process.env.DB_DRIVER==='pglite')throw new Error('Embedded development database is not allowed in production');
  if(process.env.NODE_ENV==='production'){
    if(process.env.REAL_ACCOUNTS_APPROVED!=='true')throw new Error('Real account activation is not approved');
    smtpSettings(process.env,true);
  }
  return {origin:url.origin,secure,secret,registrationEnabled:registrationEnabled()};
}
export function cookieName(config:AuthConfig){return config.secure?'__Host-tl_session':'tl_session'}
function cookie(token:string,config:AuthConfig,clear=false) {
  return `${cookieName(config)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:SESSION_SECONDS}${config.secure?'; Secure':''}`;
}
export function currentToken(request:Request,config:AuthConfig) {
  const name=cookieName(config);
  const found=request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${name}=`));
  const token=found?.slice(name.length+1);
  return token && /^[a-f0-9]{64}$/.test(token)?token:undefined;
}
function json(value:unknown,status=200,headers:Record<string,string>={}) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
}
export async function body(request:Request):Promise<unknown> {
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') throw new AuthError(415,'content_type','Utilisez un formulaire JSON.');
  const reader=request.body?.getReader();
  if(!reader) throw new AuthError(400,'invalid_body','Formulaire invalide.');
  let bytes=0;const chunks:Uint8Array[]=[];
  try {
    while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>8192){await reader.cancel();throw new AuthError(413,'body_too_large','Le formulaire est trop volumineux.')}chunks.push(part.value)}
    const all=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
  }catch(error){if(error instanceof AuthError)throw error;throw new AuthError(400,'invalid_body','Formulaire invalide.')}
}
export type AuthDependencies={config:()=>AuthConfig;service:(config:AuthConfig)=>Promise<IdentityService>};
const defaultDependencies:AuthDependencies={config:authConfig,service:async config=>new IdentityService(await getDatabase(),mailer(),config.origin,config.secret)};

export async function handleAuth(request:Request,action:string,deps:AuthDependencies=defaultDependencies):Promise<Response> {
  try {
    if(action==='config' && request.method==='GET') {
      try{const c=deps.config();return json({enabled:true,registrationEnabled:c.registrationEnabled})}catch{return json({enabled:false,registrationEnabled:false})}
    }
    const config=deps.config();
    if(request.method==='POST') {
      if(request.headers.get('origin')!==config.origin || request.headers.get('sec-fetch-site')==='cross-site') throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
      if(action==='register'&&!config.registrationEnabled) throw new AuthError(403,'registration_closed','Les inscriptions ne sont pas encore ouvertes.');
    } else if(request.method!=='GET'||action!=='session') return json({code:'not_found',message:'Action introuvable.'},404);
    const service=await deps.service(config);
    const token=currentToken(request,config);
    if(request.method==='GET') {
      const account=await service.account(token);requirePermission(account,'account:read');return json({account});
    }
    await service.rate(action==='register'?'global-registration':'global','all',action==='register'?100:500);
    const input=await body(request);
    switch(action){
      case 'register':return json(await service.register(input),202);
      case 'login':return json({message:'Connexion réussie.'},200,{'Set-Cookie':cookie(await service.login(input,token),config)});
      case 'logout':await service.logout(token);return json({message:'Déconnexion réussie.'},200,{'Set-Cookie':cookie('',config,true)});
      case 'forgot-password':return json(await service.requestEmail(input,'reset'),202);
      case 'resend-verification':return json(await service.requestEmail(input,'verify'),202);
      case 'verify-email':return json(await service.consume(input,'verify'));
      case 'reset-password':return json(await service.consume(input,'reset'));
      default:return json({code:'not_found',message:'Action introuvable.'},404);
    }
  }catch(error){
    if(error instanceof AuthError)return json({code:error.code,message:error.message},error.status,error.status===429?{'Retry-After':'900'}:{});
    if(error instanceof ZodError&&error.issues.some(issue=>issue.path[0]==='registrationRulesVersion'))return json({code:'registration_rules_updated',message:'Les règles d’inscription ont été actualisées. Rechargez la page et relisez-les avant de continuer.'},409);
    if(error instanceof ZodError)return json({code:'validation_failed',message:'Vérifiez les champs du formulaire et les consentements requis.',fields:[...new Set(error.issues.map(issue=>String(issue.path[0]||'form')))]},400);
    const reference=randomUUID();console.error('talentlink_auth_error',reference);
    return json({code:'service_unavailable',message:'Le service est temporairement indisponible.',reference},503);
  }
}
