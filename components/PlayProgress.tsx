'use client';
import {useEffect,useState} from 'react';
import {request} from '../src/client/request';
type Badge={id:string;title:string;description:string;current:number;target:number;achieved:boolean};
type Progress={summary:{started:number;completed:number;fullyAnswered:number;distinctGames:number;distinctCategories:number;bestPercentage:number;averagePercentage:number};badges:Badge[];categories:{id:string;name:string;completed:number;bestPercentage:number;averagePercentage:number}[]};
export default function PlayProgress(){
 const[data,setData]=useState<Progress|null>(null),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
 useEffect(()=>{const c=new AbortController();setLoading(true);setData(null);setMessage('');request('/api/v1/play/progress/',{signal:c.signal}).then(async r=>{if(r.status===401||r.status===403)return null;const d=await r.json();if(!r.ok)throw new Error(d.message);return d}).then(d=>{if(!c.signal.aborted)setData(d)}).catch(e=>{if(!c.signal.aborted)setMessage(e.message)}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort()},[reload]);
 if(loading)return <p role="status">Chargement du bilan Play…</p>;
 if(message)return <div className="info" role="status"><p>{message}</p><button onClick={()=>setReload(v=>v+1)}>Réessayer le bilan</button></div>;
 if(!data)return null;
 return <section aria-labelledby="play-personal-progress"><h2 id="play-personal-progress">Ma progression dans Play</h2><p>Ce bilan utilise uniquement les parties que tu as choisi d’enregistrer. Il reste privé et ne constitue pas une certification.</p>
 <dl className="play-personal-metrics">{[['Parties terminées',data.summary.completed],['Quiz différents terminés en entier',data.summary.distinctGames],['Meilleur résultat',data.summary.bestPercentage+' %'],['Réussite moyenne',data.summary.averagePercentage+' %']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
 <h3>Mes badges de progression</h3><ul className="play-badges">{data.badges.map(b=><li className={'mentor-card'+(b.achieved?' earned':'')} key={b.id}><h4>{b.title}</h4><p>{b.description}</p><p><strong>{b.achieved?'Obtenu':'À découvrir'}</strong> · {b.current} / {b.target}</p><progress value={b.current} max={b.target} aria-label={b.title}/></li>)}</ul>
 {!!data.categories.length&&<><h3>Mes résultats par domaine</h3><ul className="play-domain-results">{data.categories.map(c=><li key={c.id}><strong>{c.name}</strong><span>{c.completed} partie(s) terminée(s)</span><span>Meilleur : {c.bestPercentage} % · moyenne : {c.averagePercentage} %</span></li>)}</ul></>}
 {!data.summary.completed&&<p>Aucune partie terminée enregistrée pour le moment. Choisis l’historique au démarrage d’un quiz pour alimenter ce bilan.</p>}<p className="fine">Une partie interrompue ne débloque aucun badge de parcours. Rejouer un même quiz compte pour la pratique, mais ne crée pas de nouveau jeu ou domaine exploré.</p></section>;
}
