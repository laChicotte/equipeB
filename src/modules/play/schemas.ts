import {z} from 'zod';
const text=(min:number,max:number)=>z.string().trim().min(min).max(max);
export const level=z.enum(['beginner','intermediate','advanced']);
export const questionSchema=z.object({
 questionId:z.uuid().optional(),categoryId:z.uuid(),level,stem:text(10,1000),
 options:z.array(text(1,300)).length(3).refine(v=>new Set(v.map(s=>s.toLocaleLowerCase())).size===3,'Trois réponses distinctes requises'),
 correctIndex:z.number().int().min(0).max(2),explanation:text(20,2000),
 source:z.union([z.literal(''),z.string().max(400).url().refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password})]).default(''),
}).strict();
export const gameSchema=z.object({title:text(3,100),description:text(20,1500),categoryId:z.uuid(),level,durationMinutes:z.number().int().min(1).max(120),pointsPerAnswer:z.number().int().min(1).max(100).default(10),questionIds:z.array(z.uuid()).min(1).max(30).refine(v=>new Set(v).size===v.length)}).strict();
export const reviewQuestionSchema=z.object({id:z.uuid(),decision:z.enum(['in_review','approved','rejected','archived']),note:text(10,1000)}).strict();
export const categorySchema=z.object({id:z.uuid().optional(),name:text(2,100),expertise:text(2,60),active:z.boolean()}).strict();
export const startSchema=z.object({gameId:z.uuid(),saveHistory:z.boolean().default(false)}).strict();
export const answerSchema=z.object({attemptId:z.uuid(),index:z.number().int().min(0).max(29),choice:z.number().int().min(0).max(2)}).strict();
export const catalogSchema=z.object({q:text(0,100).default(''),category:z.union([z.literal(''),z.uuid()]).default(''),level:z.union([z.literal(''),level]).default(''),maxMinutes:z.coerce.number().int().min(1).max(120).default(120),maxQuestions:z.coerce.number().int().min(1).max(30).default(30),sort:z.enum(['recent','popular']).default('recent'),page:z.coerce.number().int().min(1).max(1000).default(1)}).strict();
