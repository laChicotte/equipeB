import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'TalentLink — Révèle ton potentiel', description: 'Apprends, rencontre des mentors bénévoles et développe tes talents en Guinée.' };
const themeScript = `(function(){try{var t=localStorage.getItem('talentlink-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){}})()`;
export default function Layout({children}: Readonly<{children:React.ReactNode}>) { return <html lang="fr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body>{children}</body></html> }
