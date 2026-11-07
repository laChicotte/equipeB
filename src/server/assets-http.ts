import {z,ZodError} from 'zod';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
import {assetStore} from './asset-store.ts';
import type {AssetStore} from './asset-store.ts';
import {authConfig,currentToken} from './auth-http.ts';
import {IdentityService} from '../modules/identity/service.ts';
import type {Account} from '../modules/identity/access.ts';
import {AuthError} from '../modules/identity/errors.ts';
import {AssetService,MAX_ASSET_BYTES} from '../modules/learning/assets.ts';
type Dependencies={enabled:()=>boolean;db:()=>Promise<Database>;store:()=>Promise<AssetStore>;account:(r:Request,db:Database)=>Promise<Account|null>;origin:()=>string;secret:()=>string};
const defaults:Dependencies={enabled:()=>process.env.ASSETS_ENABLED==='true',db:getDatabase,store:assetStore,origin:()=>authConfig().origin,secret:()=>authConfig().secret,account:async(r,db)=>{if(process.env.AUTH_ENABLED!=='true')return null;const c=authConfig();return new IdentityService(db,{async send(){}},c.origin,c.secret).account(currentToken(r,c))}};
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(d:unknown,status=200)=>Response.json(d,{status,headers});
export async function handleAssets(r:Request,assetId?:string,deps:Dependencies=defaults){try{
 if(!deps.enabled())return json({message:'Le dépôt de fichiers n’est pas activé.'},503);
 if(!['GET','POST'].includes(r.method))return json({message:'Méthode non autorisée.'},405);
 if(r.method==='POST'&&(r.headers.get('origin')!==deps.origin()||r.headers.get('sec-fetch-site')==='cross-site'))return json({message:'Origine refusée.'},403);
 const db=await deps.db(),account=await deps.account(r,db);
 if(r.method==='POST'){
  if(!account)return json({message:'Connectez-vous pour déposer un fichier.'},401);
  const kind=z.enum(['photo','document']).parse(new URL(r.url).searchParams.get('kind'));
  if(kind==='photo'?account.role!=='mentor':!['mentor','admin'].includes(account.role))return json({message:'Ce dépôt n’est pas autorisé.'},403);
  if(r.headers.get('x-file-rights')!=='accepted')return json({message:'Confirmez vos droits sur ce fichier.'},400);
  await new IdentityService(db,{async send(){}},deps.origin(),deps.secret()).rate('asset-upload',account.id,8);
  if(Number(r.headers.get('content-length')||0)>MAX_ASSET_BYTES)return json({message:'La taille maximale est de 2 Mo.'},413);
  const reader=r.body?.getReader();if(!reader)return json({message:'Fichier manquant.'},400);let length=0;const chunks:Uint8Array[]=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_ASSET_BYTES){await reader.cancel();return json({message:'La taille maximale est de 2 Mo.'},413)}chunks.push(value)}}finally{reader.releaseLock()}
  const service=new AssetService(db,await deps.store());return json(await service.upload(account,kind,Buffer.concat(chunks),r.headers.get('content-type')||'',true),201);
 }
 if(!assetId)return json({message:'Fichier introuvable.'},404);
 const file=await new AssetService(db,await deps.store()).download(account,assetId);
 return new Response(Buffer.from(file.bytes),{headers:{...headers,'Content-Type':file.type,'Content-Length':String(file.bytes.length),'Content-Disposition':file.kind==='document'?'attachment; filename="talentlink-document.pdf"':'inline; filename="talentlink-photo.webp"','Content-Security-Policy':"sandbox; default-src 'none'"}});
}catch(e){if(e instanceof AuthError)return json({message:e.message,code:e.code},e.status);if(e instanceof ZodError)return json({message:'Vérifiez le type et l’identifiant du fichier.'},400);console.error('talentlink_asset_error');return json({message:'Fichier temporairement indisponible.'},503)}}
