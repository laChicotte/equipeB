import {z} from 'zod';
const uuid=z.string().uuid();
export const programSchema=z.strictObject({programId:uuid});
export const sessionSchema=z.strictObject({programId:uuid,clientId:uuid,title:z.string().trim().min(3).max(120),startsAt:z.iso.datetime({offset:true}),durationMinutes:z.number().int().min(15).max(180)});
export const sessionActionSchema=z.strictObject({programId:uuid,id:uuid,revision:z.number().int().positive(),action:z.enum(['confirm','cancel','complete'])});
const date=z.iso.date().refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export const objectiveSchema=z.strictObject({programId:uuid,clientId:uuid,title:z.string().trim().min(3).max(200),dueDate:date.nullable()});
export const objectiveActionSchema=z.strictObject({programId:uuid,id:uuid,revision:z.number().int().positive(),status:z.enum(['todo','doing','done','cancelled'])});
