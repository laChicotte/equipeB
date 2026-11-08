export type WeeklyActivity={completed:number;games:number;days:number};
export function weeklyChallenges(activity:WeeklyActivity){
 return [
  {id:'weekly-practice',title:'Trois moments de pratique',description:'Termine entièrement trois parties enregistrées cette semaine.',target:3,value:activity.completed},
  {id:'weekly-explore',title:'Deux quiz à découvrir',description:'Termine entièrement deux quiz différents cette semaine.',target:2,value:activity.games},
  {id:'weekly-return',title:'Revenir apprendre',description:'Termine une partie enregistrée sur deux jours différents cette semaine.',target:2,value:activity.days},
 ].map(({value,...challenge})=>({...challenge,current:Math.min(value,challenge.target),achieved:value>=challenge.target}));
}
