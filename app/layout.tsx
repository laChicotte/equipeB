import type { Metadata } from 'next';
import './globals.css';
import './auth.css';
import './mentoring.css';
import './play.css';
import './messaging.css';
export const metadata: Metadata = { title: 'TalentLink — Révèle ton potentiel', metadataBase:new URL('https://talentlink.today'), description: 'Découvrez TalentLink, ses mentors publiés et ses quiz éducatifs en Guinée. Inscriptions et accompagnements privés fermés pour ce lancement.' };
const themeScript = `(function(){try{var t=localStorage.getItem('talentlink-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){}})()`;
export default function Layout({children}: Readonly<{children:React.ReactNode}>) { return <html lang="fr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body>{children}</body></html> }
