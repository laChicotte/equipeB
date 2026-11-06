import {z} from 'zod';
const text=(min:number,max:number)=>z.string().trim().min(min).max(max);
const tags=z.array(text(1,60)).max(12).transform(values=>[...new Set(values)]);
export const profileSchema=z.object({
 publicName:text(2,100),biography:text(40,3000),experience:text(20,3000),skills:tags.pipe(z.array(z.string()).min(1)),
 expertise:tags.pipe(z.array(z.string()).min(1)),languages:tags.pipe(z.array(z.string()).min(1)),generalLocation:text(2,100),
 availability:text(2,300),formats:z.array(z.enum(['online','in_person'])).min(1).max(2),
 professionalLinks:z.array(z.string().max(300).url().refine(value=>{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password},'Lien HTTPS requis')).max(3),
 revision:z.number().int().nonnegative(),
}).strict();
export const reviewSchema=z.object({id:z.uuid(),revision:z.number().int().positive(),decision:z.enum(['publish','reject','suspend']),note:text(10,1000)}).strict();
export const requestSchema=z.object({mentorId:z.uuid(),goal:text(20,2000)}).strict();
export const transitionSchema=z.object({id:z.uuid(),status:z.enum(['accepted','declined','cancelled'])}).strict();
export const programSchema=z.object({id:z.uuid(),status:z.enum(['active','suspended','completed','cancelled']),goal:text(20,2000)}).strict();
export const searchSchema=z.object({q:text(0,100).default(''),expertise:text(0,60).default(''),language:text(0,60).default(''),location:text(0,100).default(''),availability:text(0,100).default(''),format:z.enum(['','online','in_person']).default(''),page:z.coerce.number().int().min(1).max(1000).default(1)}).strict();
