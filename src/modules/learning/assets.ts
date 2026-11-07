import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {z} from 'zod';
import type {Database} from '../../server/database.ts';
import type {AssetStore} from '../../server/asset-store.ts';
import type {Account} from '../identity/access.ts';
import {AuthError} from '../identity/errors.ts';
import {MentoringService} from '../mentoring/service.ts';
export const MAX_ASSET_BYTES=2*1024*1024;
type Kind='photo'|'document';
const unavailable=()=>new AuthError(404,'not_found','Ce fichier n’est pas disponible.');
const invalid=()=>new AuthError(400,'invalid_file','Choisissez une photo JPEG, PNG ou WebP, ou un document PDF valide de 2 Mo maximum.');
export async function prepareAsset(kind:Kind,bytes:Uint8Array,declaredType:string){
 if(!bytes.length||bytes.length>MAX_ASSET_BYTES)throw new AuthError(413,'file_size','La taille maximale est de 2 Mo.');
 const buffer=Buffer.from(bytes);
 if(kind==='document'){
  if(declaredType!=='application/pdf'||buffer.subarray(0,5).toString()!=='%PDF-'||!buffer.subarray(-1024).toString('latin1').includes('%%EOF'))throw invalid();
  // A format check, not an antivirus. Documents are served as attachments, never inline.
  if(/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|XFA|OpenAction|Encrypt)\b/.test(buffer.toString('latin1')))throw invalid();
  return {bytes:buffer,type:'application/pdf',extension:'pdf'};
 }
 if(!['image/jpeg','image/png','image/webp'].includes(declaredType))throw invalid();
 try{const image=sharp(buffer,{limitInputPixels:8000000,failOn:'warning'}),meta=await image.metadata();const types:Record<string,string>={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};if(!meta.format||types[meta.format]!==declaredType||(meta.pages||1)>1)throw invalid();const output=await image.rotate().resize(384,384,{fit:'cover'}).webp({quality:82}).toBuffer();return {bytes:output,type:'image/webp',extension:'webp'}}catch{throw invalid()}
}
export class AssetService{
 db:Database;store:AssetStore;
 constructor(db:Database,store:AssetStore){this.db=db;this.store=store}
 async upload(account:Account|null,kind:Kind,bytes:Uint8Array,type:string,rightsAccepted:boolean){if(!rightsAccepted)throw new AuthError(400,'rights_required','Confirmez votre droit de déposer et proposer ce fichier.');
  // Recheck the account before parsing images or writing any object.
  await this.db.transaction(async sql=>{const u=await new MentoringService(this.db).actor(sql,account);if(kind==='photo'?u.role!=='mentor':!['mentor','admin'].includes(u.role))throw new AuthError(403,'forbidden','Ce dépôt n’est pas autorisé.')});
  const file=await prepareAsset(kind,bytes,type),id=randomUUID(),key=kind+'/'+id+'.'+file.extension;
  await this.db.transaction(async sql=>{const u=await new MentoringService(this.db).actor(sql,account,undefined,false,true);await sql.query('SELECT pg_advisory_xact_lock(17382911)');const [size]=await sql.query<{own:string;total:string}>("SELECT coalesce(sum(size_bytes) FILTER(WHERE owner_id=$1),0)::text AS own,coalesce(sum(size_bytes),0)::text AS total FROM stored_asset",[u.id]);if(Number(size.own)+file.bytes.length>64*1024*1024||Number(size.total)+file.bytes.length>512*1024*1024)throw new AuthError(409,'storage_limit','La limite de stockage est atteinte. Contactez l’équipe.');await sql.query('INSERT INTO stored_asset(id,owner_id,kind,storage_key,content_type,size_bytes,sha256) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,u.id,kind,key,file.type,file.bytes.length,createHash('sha256').update(file.bytes).digest('hex')])});
  try{await this.store.put(key,file.bytes,file.type);await this.db.query("UPDATE stored_asset SET status='ready' WHERE id=$1",[id])}catch{await this.db.query("UPDATE stored_asset SET status='failed' WHERE id=$1",[id]);throw new AuthError(503,'storage_unavailable','Le dépôt n’a pas pu être confirmé. Actualisez avant de réessayer.')}
  return {id,kind,contentType:file.type,size:file.bytes.length,url:'/api/files/'+id+'/'};
 }
 async download(account:Account|null,assetId:string){z.uuid().parse(assetId);const asset=await this.db.transaction(async sql=>{const user=account?await new MentoringService(this.db).actor(sql,account):null;
  const [a]=await sql.query<{storage_key:string;content_type:string;size_bytes:number;sha256:string;kind:Kind;owner_id:string}>(`SELECT a.* FROM stored_asset a WHERE a.id=$1 AND a.status='ready' AND (a.owner_id=$2 OR ($3 IN ('admin','moderator') AND EXISTS(SELECT 1 FROM library_resource reviewing WHERE reviewing.file_id=a.id AND reviewing.status='submitted')) OR ($3='admin' AND EXISTS(SELECT 1 FROM mentor_profile reviewing WHERE reviewing.photo_id=a.id AND reviewing.publication_status='submitted')) OR EXISTS(SELECT 1 FROM library_resource r WHERE r.file_id=a.id AND r.status='published') OR EXISTS(SELECT 1 FROM mentor_profile p JOIN app_user u ON u.id=p.user_id WHERE p.photo_id=a.id AND p.publication_status='published' AND p.verification_status='verified' AND u.role='mentor' AND u.disabled_at IS NULL AND u.email_verified_at IS NOT NULL AND u.adult_access_approved_at IS NOT NULL))`,[assetId,user?.id||null,user?.role||'']);if(!a)throw unavailable();return a});const bytes=await this.store.get(asset.storage_key);if(bytes.length!==asset.size_bytes||createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new AuthError(503,'file_integrity','Ce fichier est temporairement indisponible.');return {bytes,type:asset.content_type,kind:asset.kind};
 }
}
