import type { Metadata } from 'next';
import {ADULT_ACCOUNTS_PHASE} from '../src/content/registration';
import {localPrototype} from '../src/server/prototype';
import './globals.css';
import './auth.css';
import './mentoring.css';
import './play.css';
import './messaging.css';
import './learning.css';
export const metadata: Metadata = { title: 'TalentLink — Révèle ton potentiel', metadataBase:new URL('https://talentlink.today'), description: ADULT_ACCOUNTS_PHASE?'Créez votre compte TalentLink dès 18 ans : quiz, bibliothèque et progression personnelle en Guinée.':'Découvrez TalentLink, ses mentors publiés et ses quiz éducatifs en Guinée. Inscriptions et accompagnements privés fermés pour ce lancement.' };
const themeScript = `(function(){try{var t=localStorage.getItem('talentlink-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){}})()`;
export default function Layout({children}: Readonly<{children:React.ReactNode}>) { return <html lang="fr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body>{localPrototype()&&<aside className="prototype-banner">PROTOTYPE LOCAL · Comptes et données fictifs · <a href="/prototype/">Tous les modules et comptes d’essai →</a></aside>}{children}</body></html> }
