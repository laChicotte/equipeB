import {z} from 'zod';
export const availabilityTimezone=z.string().trim().min(1).max(80).refine(value=>{
 try{if(!/^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+){1,2})$/.test(value))return false;new Intl.DateTimeFormat('fr',{timeZone:value});return true}catch{return false}
},'Choisis un fuseau horaire IANA valide.').transform(value=>new Intl.DateTimeFormat('fr',{timeZone:value}).resolvedOptions().timeZone);
const slot=z.object({day:z.number().int().min(1).max(7),start:z.number().int().min(0).max(1425).multipleOf(15),end:z.number().int().min(15).max(1440).multipleOf(15)}).strict().refine(v=>v.end-v.start>=15&&v.end-v.start<=720,'Durée de quinze minutes à douze heures, sans traverser minuit.');
export type WeeklySlot=z.infer<typeof slot>;
export const weeklySlots=z.array(slot).max(21).superRefine((items,ctx)=>{
 const sorted=[...items].sort((a,b)=>a.day-b.day||a.start-b.start);
 for(let i=1;i<sorted.length;i++)if(sorted[i].day===sorted[i-1].day&&sorted[i].start<sorted[i-1].end)ctx.addIssue({code:'custom',message:'Deux créneaux du même jour ne peuvent pas se chevaucher.'});
}).transform(items=>[...items].sort((a,b)=>a.day-b.day||a.start-b.start));
