import {randomUUID} from 'node:crypto';
import {ZodError} from 'zod';
import {authConfig,currentToken,body} from './auth-http.ts';
import type {AuthConfig} from './auth-http.ts';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {IdentityService} from '../modules/identity/service.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {AttestationService} from '../modules/attestations/service.ts';
export function attestationFlags(env:Record<string,string|undefined>=process.env){return {enabled:env.ATTESTATIONS_ENABLED==='true'&&(env.NODE_ENV!=='production'||env.ATTESTATIONS_APPROVED==='true')}}
type Dependencies={db:()=>Promise<Database>;config:()=>AuthConfig;flags:()=>{enabled:boolean};account:(r:Request,c:AuthConfig,db:Database)=>Promise<Account|null>};
const defaults:Dependencies={db:getDatabase,config:authConfig,flags:attestationFlags,account:async(r,c,db)=>new IdentityService(db,{async send(){}},c.origin,c.secret).account(currentToken(r,c))};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function handleAttestations(request:Request,action:string,deps:Dependencies=defaults){try{
 const method=request.method,flags=deps.flags();if(action==='config'&&method==='GET')return json(flags);
 const gets=['own','detail','candidates'],posts=['issue','revoke','share','verify'];if(![...gets,...posts].includes(action))return json({message:'Action introuvable.'},404);
 if((method==='GET'&&!gets.includes(action))||(method==='POST'&&!posts.includes(action))||!['GET','POST'].includes(method))return json({message:'Méthode non autorisée.'},405);
 const config=deps.config();if(method==='POST'&&(request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AuthError(403,'invalid_origin','Cette requête n’est pas autorisée.');
 if(action==='issue'&&!flags.enabled)throw new AuthError(403,'attestations_closed','La délivrance des attestations n’est pas encore ouverte.');
 const db=await deps.db();const service=new AttestationService(db,flags.enabled);
 if(action==='verify'){await new IdentityService(db,{async send(){}},config.origin,config.secret).rate('attestation-verification','public',120);return json({attestation:await service.verify(await body(request))})}
 const account=await deps.account(request,config,db);if(!account)throw new AuthError(401,'unauthenticated','Connectez-vous pour continuer.');
 if(method==='GET'){if(action==='own')return json({items:await service.own(account)});if(action==='candidates')return json({items:await service.candidates(account)});return json({attestation:await service.detail(account,Object.fromEntries(new URL(request.url).searchParams))})}
 await new IdentityService(db,{async send(){}},config.origin,config.secret).rate('attestations-'+action,account.id,30);const input=await body(request);if(action==='share')return json(await service.share(account,input));return action==='issue'?json(await service.issue(account,input),201):json(await service.revoke(account,input));
}catch(e){if(e instanceof AuthError)return json({code:e.code,message:e.message},e.status);if(e instanceof ZodError)return json({message:'Vérifiez les champs du formulaire.'},400);console.error('talentlink_attestations_error',randomUUID());return json({message:'Le service des attestations est temporairement indisponible.'},503)}}
