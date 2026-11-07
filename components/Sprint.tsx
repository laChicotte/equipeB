'use client';
import {useEffect,useState} from 'react';
import {request} from '../src/client/request';
type Category={id:string;name:string};
type Draft={requestKey:string;categoryId:string;level:string;topic:string;publishAccepted:true};
export function SprintCreator(){
 const[enabled,setEnabled]=useState(false),[signedIn,setSignedIn]=useState(false),[categories,setCategories]=useState<Category[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  Promise.all([request('/api/v1/play/sprint',{signal:controller.signal}).then(r=>r.json()),request('/api/v1/auth/session',{signal:controller.signal}).then(r=>r.json()),request('/api/v1/play/categories',{signal:controller.signal}).then(r=>r.json())]).then(([config,session,cats])=>{if(controller.signal.aborted)return;setEnabled(config.enabled===true);setSignedIn(!!session.account?.emailVerified);setCategories(cats.items||[]);setReady(true)}).catch(()=>{if(!controller.signal.aborted)setMessage('Impossible de vérifier le service IA. Actualise la page.')});
  try{const saved=sessionStorage.getItem('tl-sprint-request');if(saved)setDraft(JSON.parse(saved))}catch{}
  return()=>controller.abort();
 },[]);
 async function generate(input:Draft){
  setBusy(true);setMessage('Création des questions et contrôle IA en cours…');setDraft(input);
  try{sessionStorage.setItem('tl-sprint-request',JSON.stringify(input))}catch{}
  try{
   const response=await request('/api/v1/play/sprint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)},85_000);
   const data=await response.json();if(!response.ok)throw new Error(data.message||'Génération indisponible.');
   try{sessionStorage.removeItem('tl-sprint-request')}catch{}
   location.assign('/play/'+data.id+'/');
  }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
 }
 function reset(){setDraft(null);setMessage('');try{sessionStorage.removeItem('tl-sprint-request')}catch{}}
 return <section className="mentor-card sprint-creator" aria-labelledby="sprint-title"><span className="mentor-badge">NOUVEAU · IA</span><h2 id="sprint-title">Mode Sprint : ton sujet, ton défi.</h2><p>5 questions, 3 choix et 3 minutes pour apprendre. L’IA prépare les corrections et les explications, puis ajoute le jeu au catalogue public.</p>
 {!ready?<p role="status">{message||'Vérification du service IA…'}</p>:!enabled?<p>Le mode Sprint IA est en cours de préparation. Les autres quiz restent disponibles.</p>:!signedIn?<p><a className="button" href="/auth/connexion/">Me connecter pour créer un Sprint</a></p>:draft?<div><p>Demande préparée : {draft.topic}. Si la réponse a été interrompue, retrouve le résultat sans créer un second jeu.</p><div className="mentor-actions"><button className="button" disabled={busy} onClick={()=>void generate(draft)}>{busy?'Génération en cours…':'Vérifier cette demande'}</button><button disabled={busy} onClick={reset}>Nouvelle demande</button></div></div>:<form className="auth-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void generate({requestKey:crypto.randomUUID(),topic:String(f.get('topic')),categoryId:String(f.get('category')),level:String(f.get('level')),publishAccepted:true})}}>
 <label className="field">Que veux-tu apprendre ?<input name="topic" required minLength={3} maxLength={160} placeholder="Ex. les bases de l’énergie solaire"/></label><label className="field">Catégorie<select name="category" required>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field">Niveau<select name="level"><option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option></select></label>
 <p className="fine">Donne un sujet général, sans nom de personne ni information privée. Seuls ton sujet, le niveau et la catégorie sont envoyés au service IA ; les informations de ton compte ne le sont pas.</p><label className="check"><input type="checkbox" required/>J’accepte que le quiz généré soit public et que mon sujet soit traité par le service IA.</label><button className="button" disabled={busy||!categories.length}>Créer mon Sprint IA →</button></form>}
 <p className="fine">3 générations par compte et par jour ; 30 pour la plateforme. Les demandes échouées comptent aussi. Contrôle automatisé, sans validation humaine systématique : des erreurs restent possibles.</p>{ready&&message&&<p className="info" role="status">{message}</p>}</section>;
}
export function SprintReport({gameId}:{gameId:string}){
 const[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function report(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const reason=new FormData(event.currentTarget).get('reason');setBusy(true);try{const r=await request('/api/v1/play/sprint?action=report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameId,reason})});const d=await r.json();setMessage(d.message)}catch{setMessage('Signalement indisponible. Réessaie plus tard.')}finally{setBusy(false)}}
 return <details className="mentor-card"><summary>Signaler une erreur dans ce Sprint IA</summary><form className="auth-form" onSubmit={report}><label className="field">Motif<select name="reason"><option value="incorrect">Question ou correction incorrecte</option><option value="inappropriate">Contenu inapproprié</option><option value="personal_data">Information personnelle</option></select></label><button disabled={busy}>Envoyer le signalement</button></form><p className="fine">Connexion avec une adresse confirmée requise.</p>{message&&<p role="status">{message}</p>}</details>;
}
