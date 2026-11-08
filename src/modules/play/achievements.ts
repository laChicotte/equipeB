export type Badge={id:string;title:string;description:string};
export function partyBadges(input:{completed:boolean;answered:number;total:number;correct:number}):Badge[]{
 if(!input.completed||input.total<1||input.answered!==input.total)return [];
 const badges:Badge[]=[{id:'quiz-complete',title:'Quiz terminé',description:'Tu as répondu à toutes les questions de cette partie.'}];
 if(input.correct*5>=input.total*4)badges.push({id:'eighty-percent',title:'Cap des 80 %',description:'Au moins 80 % de bonnes réponses dans cette partie.'});
 if(input.correct===input.total)badges.push({id:'perfect-round',title:'Sans-faute',description:'Toutes les réponses de cette partie sont correctes.'});
 return badges;
}
export type ProgressCounts={fullyAnswered:number;distinctGames:number;distinctCategories:number;successfulGames:number};
export function progressBadges(counts:ProgressCounts){
 return [
  {id:'first-saved',title:'Premier quiz enregistré',description:'Terminer entièrement un quiz avec enregistrement de l’historique.',target:1,value:counts.fullyAnswered},
  {id:'five-rounds',title:'Cinq parties terminées',description:'Répondre à toutes les questions de cinq parties enregistrées.',target:5,value:counts.fullyAnswered},
  {id:'three-games',title:'Trois quiz explorés',description:'Terminer entièrement trois jeux différents enregistrés.',target:3,value:counts.distinctGames},
  {id:'three-domains',title:'Trois domaines découverts',description:'Terminer entièrement des jeux de trois catégories différentes.',target:3,value:counts.distinctCategories},
  {id:'three-successes',title:'Trois quiz à 80 %',description:'Terminer entièrement trois jeux différents à au moins 80 % de réussite.',target:3,value:counts.successfulGames},
 ].map(b=>({...b,current:Math.min(b.value,b.target),achieved:b.value>=b.target}));
}
