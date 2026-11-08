'use client';
import {useEffect,useState} from 'react';
import {request} from '../src/client/request';
export default function NotificationLink(){
 const[unread,setUnread]=useState<number|null>(null);
 useEffect(()=>{
  let alive=true,canPoll=true,inflight:AbortController|null=null;
  async function load(force=false){
   if(document.hidden||(!force&&(!canPoll||inflight)))return;
   if(force)setUnread(null);inflight?.abort();const c=new AbortController();inflight=c;
   try{const r=await request('/api/v1/notifications/count/',{signal:c.signal});if(c.signal.aborted||!alive)return;if(r.status===401||r.status===403){setUnread(null);canPoll=false;return}if(!r.ok)return;const d=await r.json();if(!c.signal.aborted&&alive){setUnread(d.unread);canPoll=true}}
   catch{}finally{if(inflight===c)inflight=null}
  }
  const refresh=()=>void load(true),visibility=()=>{if(document.hidden)inflight?.abort();else refresh()};
  void load();const timer=setInterval(()=>void load(),60_000);addEventListener('focus',refresh);addEventListener('talentlink-notices-changed',refresh);document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;inflight?.abort();clearInterval(timer);removeEventListener('focus',refresh);removeEventListener('talentlink-notices-changed',refresh);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 return <a href="/compte/notifications/" aria-label={unread?`Notifications, ${unread} non lues`:'Notifications'}>Notifications{unread?` (${unread>99?'99+':unread})`:''}</a>;
}
