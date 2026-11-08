'use client';
import {useEffect,useState} from 'react';
import {request} from '../src/client/request';
type Cursor={before:string;beforeId:string};
type Notice={id:string;body:string;href:string;read_at:string|null;created_at:string};
export default function Notifications(){
 const[items,setItems]=useState<Notice[]>([]),[unread,setUnread]=useState(0),[filter,setFilter]=useState('all'),[cursor,setCursor]=useState<Cursor|null>(null),[next,setNext]=useState<Cursor|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[reload,setReload]=useState(0),[allowed,setAllowed]=useState(false);
 useEffect(()=>{
  const c=new AbortController();setLoading(true);setMessage('');
  request('/api/v1/notifications/?'+new URLSearchParams({filter,...cursor||{}}),{signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);return d}).then(d=>{if(!c.signal.aborted){setItems(d.items);setUnread(d.unread);setNext(d.next);setAllowed(true)}}).catch(e=>{if(!c.signal.aborted){setItems([]);setNext(null);setAllowed(false);setMessage(e.message)}}).finally(()=>{if(!c.signal.aborted)setLoading(false)});
  return()=>c.abort();
 },[filter,cursor,reload]);
 async function mark(ids:string[]){setBusy(true);setMessage('');try{const r=await request('/api/v1/notifications/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});const d=await r.json();if(!r.ok)throw new Error(d.message);if(filter==='unread')setCursor(null);setReload(v=>v+1);dispatchEvent(new Event('talentlink-notices-changed'))}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 const unreadIds=items.filter(n=>!n.read_at).map(n=>n.id);
 return <><div className="eyebrow">MON ESPACE PRIVÉ</div><h1>Mes notifications</h1><p>Les décisions de validation concernant ton profil et tes contributions apparaissent ici. Les nouvelles notifications restent non lues tant que tu ne les marques pas comme lus.</p>
 <div className="mentor-actions"><label className="field">Afficher<select disabled={busy||loading} value={filter} onChange={e=>{setFilter(e.target.value);setCursor(null)}}><option value="all">Toutes les notifications</option><option value="unread">Non lues seulement</option></select></label><button disabled={busy||loading} onClick={()=>{setCursor(null);setReload(v=>v+1)}}>Actualiser depuis le début</button>{allowed&&<button disabled={busy||loading||!unreadIds.length} onClick={()=>void mark(unreadIds)}>Marquer cette page comme lue</button>}</div>
 {message&&<p className="info" role="alert">{message}</p>}{loading?<p role="status">Chargement des notifications…</p>:allowed?<><p role="status">{unread} notification{unread!==1?'s':''} non lue{unread!==1?'s':''}.</p>{!items.length&&<p>Aucune notification pour ce filtre.</p>}<ol className="notice-list">{items.map(n=><li className={'mentor-card'+(!n.read_at?' unread':'')} key={n.id}><p><strong>{n.read_at?'Lue':'Non lue'}</strong> · <time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString('fr-FR')}</time></p><h2>{n.body}</h2><div className="mentor-actions"><a href={n.href}>Ouvrir l’espace concerné</a>{!n.read_at&&<button disabled={busy} onClick={()=>void mark([n.id])}>Marquer comme lue</button>}</div></li>)}</ol><nav className="mentor-pagination" aria-label="Pages des notifications">{cursor&&<button disabled={busy} onClick={()=>setCursor(null)}>Retour au début</button>}{next&&<button disabled={busy} onClick={()=>setCursor(next)}>Notifications plus anciennes</button>}</nav></>:<p><a href="/auth/connexion/">Se connecter</a></p>}
 <p className="fine">Le marquage concerne seulement les notifications affichées. Les nouveaux éléments restent non lus. Aucune alerte sur l’appareil ni e-mail supplémentaire n’est envoyé.</p></>;
}
