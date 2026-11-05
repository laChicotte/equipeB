'use client';
import {useEffect,useState} from 'react';
export default function ThemeSelect(){
 const[theme,setTheme]=useState<string|null>(null);
 useEffect(()=>{try{const stored=localStorage.getItem('talentlink-theme');setTheme(stored==='dark'||stored==='light'?stored:'system')}catch{setTheme('system')}},[]);
 useEffect(()=>{if(!theme)return;const media=matchMedia('(prefers-color-scheme: dark)');const update=()=>{document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[theme]);
 return <label className="footer-theme">Apparence <select disabled={!theme} value={theme||'system'} onChange={e=>{setTheme(e.target.value);try{localStorage.setItem('talentlink-theme',e.target.value)}catch{}}}><option value="system">Automatique</option><option value="light">Clair</option><option value="dark">Sombre</option></select></label>;
}
