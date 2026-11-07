import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {localPrototype} from './prototype.ts';
export interface AssetStore{put(key:string,bytes:Uint8Array,type:string):Promise<void>;get(key:string):Promise<Uint8Array>}
function validKey(key:string){if(!/^(photo|document)\/[a-f0-9-]{36}\.(webp|pdf)$/.test(key))throw Error('Invalid object key')}
export async function assetStore():Promise<AssetStore>{
 if(localPrototype()){const root=path.resolve('.local/prototype-files');return {async put(key,bytes){validKey(key);const file=path.join(root,key);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes,{mode:0o600})},async get(key){validKey(key);return readFile(path.join(root,key))}}}
 const endpoint=new URL(process.env.FILES_ENDPOINT||'');if(endpoint.protocol!=='https:'||!endpoint.hostname.endsWith('.neon.tech')||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw Error('Storage configuration unavailable');
 const accessKeyId=process.env.FILES_ACCESS_KEY_ID,secretAccessKey=process.env.FILES_SECRET_ACCESS_KEY;if(!accessKeyId||!secretAccessKey||!process.env.FILES_REGION)throw Error('Storage credentials unavailable');
 const {S3Client,PutObjectCommand,GetObjectCommand}=await import('@aws-sdk/client-s3');
 const client=new S3Client({endpoint:endpoint.origin,region:process.env.FILES_REGION,credentials:{accessKeyId,secretAccessKey},forcePathStyle:true,maxAttempts:2,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
 return {async put(key,bytes,type){validKey(key);await client.send(new PutObjectCommand({Bucket:'talentlink-files',Key:key,Body:bytes,ContentType:type,CacheControl:'private, no-store'}),{abortSignal:AbortSignal.timeout(20000)})},async get(key){validKey(key);const r=await client.send(new GetObjectCommand({Bucket:'talentlink-files',Key:key}),{abortSignal:AbortSignal.timeout(20000)});if(!r.Body)throw Error('Object unavailable');return r.Body.transformToByteArray()}};
}
