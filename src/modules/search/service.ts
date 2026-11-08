import {z} from 'zod';
import type {Database} from '../../server/database.ts';
import {PlayService} from '../play/service.ts';
import {LearningService} from '../learning/service.ts';
import {MentoringService} from '../mentoring/service.ts';
export const searchInput=z.object({q:z.string().trim().min(2).max(100),type:z.enum(['all','play','resource','mentor']).default('all'),page:z.coerce.number().int().min(1).max(1000).default(1)}).strict().refine(v=>v.type!=='all'||v.page===1,'La vue groupée présente la première page');
type Kind='play'|'resource'|'mentor';
export type SearchItem={id:string;title:string;summary:string;meta:string;href:string;aiGenerated?:boolean};
export type SearchGroup={kind:Kind;label:string;available:boolean;total:number;items:SearchItem[]};
const excerpt=(v:unknown)=>{const chars=Array.from(String(v||'').replace(/\s+/g,' ').trim());return chars.slice(0,190).join('')+(chars.length>190?'…':'')};
export class SearchService{
 constructor(db:Database,flags:{play:boolean;resources:boolean}){this.db=db;this.flags=flags}
 private db:Database;private flags:{play:boolean;resources:boolean};
 async search(input:unknown){
  const v=searchInput.parse(input),limit=v.type==='all'?4:12;
  const sources:Kind[]=v.type==='all'?['play','resource','mentor']:[v.type];
  const groups=await Promise.all(sources.map(async(kind):Promise<SearchGroup>=>{
   const label=kind==='play'?'TalentLink Play':kind==='resource'?'Bibliothèque':'Mentors';
   const available=kind==='play'?this.flags.play:kind==='resource'?this.flags.resources:true;
   if(!available)return {kind,label,available:false,total:0,items:[]};
   if(kind==='play'){
    const result=await new PlayService(this.db).catalog({q:v.q,page:v.page});
    return {kind,label,available:true,total:result.total,items:result.items.slice(0,limit).map(g=>({id:String(g.id),title:String(g.title),summary:excerpt(g.description),meta:String(g.category),href:'/play/'+g.id+'/',aiGenerated:g.ai_generated===true}))};
   }
   if(kind==='resource'){
    const result=await new LearningService(this.db).resources(null,{q:v.q,page:v.page});
    return {kind,label,available:true,total:result.total,items:result.items.slice(0,limit).map(r=>({id:String(r.id),title:String(r.title),summary:excerpt(r.summary),meta:String(r.category),href:'/bibliotheque/'+r.id+'/'}))};
   }
   const result=await new MentoringService(this.db).search({q:v.q,page:v.page});
   return {kind,label,available:true,total:result.total,items:result.items.slice(0,limit).map(m=>({id:String(m.id),title:String(m.public_name),summary:excerpt(m.biography),meta:Array.isArray(m.expertise)?m.expertise.join(', '):'',href:'/mentors/'+m.id+'/'}))};
  }));
  return {q:v.q,type:v.type,page:v.page,pageSize:limit,total:groups.reduce((n,g)=>n+g.total,0),groups};
 }
}
