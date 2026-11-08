'use client';
export type WeeklySlot={day:number;start:number;end:number};
export const weekdays=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const time=(minutes:number)=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
const minutes=(value:string)=>{const [h,m]=value.split(':').map(Number);return h*60+m};
function nextSlot(slots:WeeklySlot[]):WeeklySlot|undefined{
 for(const duration of [60,15])for(let day=1;day<=7;day++)for(let offset=0;offset<1440;offset+=15){const start=(540+offset)%1440,end=start+duration;if(end<=1440&&!slots.some(s=>s.day===day&&start<s.end&&end>s.start))return {day,start,end}}
}
export function AvailabilityView({slots,timezone}:{slots:WeeklySlot[];timezone:string}){
 if(!slots.length)return null;
 return <div className="mentor-weekly"><p><strong>Horaires hebdomadaires</strong> · Fuseau {timezone}</p><ul>{slots.map((s,i)=><li key={i}>{weekdays[s.day-1]} : {time(s.start)} à {time(s.end)}</li>)}</ul><p className="fine">Horaires indicatifs dans le fuseau du mentor, à confirmer lors d’un échange. Ils ne constituent pas une réservation.</p></div>;
}
export default function MentorAvailability({slots,timezone,onChange,onTimezoneChange,disabled}:{slots:WeeklySlot[];timezone:string;onChange:(v:WeeklySlot[])=>void;onTimezoneChange:(v:string)=>void;disabled:boolean}){
 function change(index:number,field:keyof WeeklySlot,value:number){onChange(slots.map((slot,i)=>i===index?{...slot,[field]:value}:slot))}
 const candidate=nextSlot(slots);
 return <fieldset className="mentor-weekly-editor" disabled={disabled}><legend>Créneaux hebdomadaires facultatifs</legend><p>Ces horaires apparaîtront sur ton profil après validation. Les horaires utilisent le fuseau indiqué, sans conversion automatique pour le visiteur.</p><label className="field">Fuseau horaire<input required maxLength={80} value={timezone} onChange={e=>onTimezoneChange(e.target.value)} list="mentor-timezones" placeholder="Africa/Conakry"/></label><datalist id="mentor-timezones">{['Africa/Conakry','Africa/Dakar','Africa/Abidjan','Europe/Paris','America/New_York','UTC'].map(t=><option key={t} value={t}/>)}</datalist>
 {slots.map((slot,index)=><div className="mentor-weekly-row" key={index}><label className="field">Jour<select value={slot.day} onChange={e=>change(index,'day',Number(e.target.value))}>{weekdays.map((day,i)=><option value={i+1} key={day}>{day}</option>)}</select></label><label className="field">Début<input type="time" required step={900} value={time(slot.start)} onChange={e=>{if(e.target.value)change(index,'start',minutes(e.target.value))}}/></label><label className="field">Fin<select value={slot.end} onChange={e=>change(index,'end',Number(e.target.value))}>{Array.from({length:96},(_,i)=>(i+1)*15).map(m=><option value={m} key={m}>{time(m)}</option>)}</select></label><button type="button" onClick={()=>onChange(slots.filter((_,i)=>i!==index))} aria-label={'Retirer le créneau '+(index+1)}>Retirer</button></div>)}
 <button type="button" disabled={slots.length>=21||!candidate} onClick={()=>{if(candidate)onChange([...slots,candidate])}}>Ajouter un créneau</button><p className="fine">21 créneaux maximum. Horaires par quarts d’heure, durée de quinze minutes à douze heures et aucun chevauchement le même jour. Une plage qui traverse minuit doit être séparée sur deux jours. L’enregistrement remet le profil en brouillon.</p></fieldset>;
}
