import {ZodError} from 'zod';
import {SearchService,searchInput} from '../modules/search/service.ts';
import {getDatabase} from './database.ts';
import type {Database} from './database.ts';
type Dependencies={db:()=>Promise<Database>;env:Record<string,string|undefined>};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function handleSearch(request:Request,deps:Dependencies={db:getDatabase,env:process.env}){
 try{
  if(request.method!=='GET')return json({message:'Méthode non autorisée.'},405);
  const input=searchInput.parse(Object.fromEntries(new URL(request.url).searchParams));
  const db=await deps.db();
  return json(await new SearchService(db,{play:deps.env.PLAY_ENABLED==='true',resources:deps.env.LEARNING_ENABLED==='true'}).search(input));
 }catch(error){
  if(error instanceof ZodError)return json({message:'Saisis entre 2 et 100 caractères et choisis un filtre valide.'},400);
  console.error('talentlink_public_search_failed');return json({message:'La recherche est momentanément indisponible. Réessaie plus tard.'},503);
 }
}
