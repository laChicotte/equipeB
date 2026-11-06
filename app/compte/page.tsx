import AccountPanel from '../../components/AccountPanel';
import ThemeSelect from '../../components/ThemeSelect';
export const metadata={title:'Mon espace — TalentLink',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function AccountPage(){return <><a className="skip" href="#contenu">Aller au contenu</a><main className="auth-page"><div className="auth-top"><a href="/" className="brand">talent<span>link</span></a><ThemeSelect/></div><section id="contenu" tabIndex={-1} className="auth-card"><div className="eyebrow">MON COMPTE</div><AccountPanel/></section><a href="/" className="auth-back">← Retour à l’accueil</a></main></>}
