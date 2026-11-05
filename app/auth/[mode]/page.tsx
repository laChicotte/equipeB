import {notFound} from 'next/navigation';
import AuthForm from '../../../components/AuthForm';
import type {AuthMode} from '../../../components/AuthForm';
import ThemeSelect from '../../../components/ThemeSelect';
export const metadata={title:'Mon compte — TalentLink',robots:{index:false,follow:false},referrer:'no-referrer' as const};
const modes:AuthMode[]=['connexion','inscription','mot-de-passe-oublie','reinitialiser','verifier','renvoyer-verification'];
export function generateStaticParams(){return modes.map(mode=>({mode}))}
export default async function AuthPage({params}:{params:Promise<{mode:string}>}){
 const{mode}=await params;if(!modes.includes(mode as AuthMode))notFound();
 return <main className="auth-page"><div className="auth-top"><a href="/" className="brand">talent<span>link</span></a><ThemeSelect/></div><section className="auth-card"><div className="eyebrow">APPRENDS. CONNECTE-TOI. RÉALISE TON POTENTIEL.</div><AuthForm mode={mode as AuthMode}/></section><a href="/" className="auth-back">← Retour aux contenus publics</a></main>;
}
