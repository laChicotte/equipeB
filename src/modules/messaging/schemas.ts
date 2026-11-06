import {z} from 'zod';
export const sendSchema=z.object({programId:z.uuid(),clientId:z.uuid(),body:z.string().trim().min(1).max(2000)}).strict();
export const pageSchema=z.object({programId:z.uuid(),before:z.string().refine(value=>/^[1-9][0-9]{0,18}$/.test(value)&&BigInt(value)<=9223372036854775807n).optional()}).strict();
export const readSchema=z.object({programId:z.uuid(),messageId:z.uuid()}).strict();
export const blockSchema=z.object({programId:z.uuid(),blocked:z.boolean()}).strict();
export const reportSchema=z.object({programId:z.uuid(),messageId:z.uuid(),reason:z.enum(['harassment','inappropriate','spam','safety','other']),details:z.string().trim().min(10).max(1000)}).strict();
export const moderationSchema=z.object({id:z.uuid(),action:z.enum(['hide','dismiss']),note:z.string().trim().min(10).max(1000)}).strict();
