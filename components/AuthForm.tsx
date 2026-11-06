'use client';
import {request} from '../src/client/request';
import {useEffect,useState} from 'react';
export type AuthMode='connexion'|'inscription'|'mot-de-passe-oublie'|'reinitialiser'|'verifier'|'renvoyer-verification';
const descriptions:Record<AuthMode,{title:string;intro:string;button:string;action:string}>={
 connexion:{title:'Heureux de te retrouver.',intro:'Connecte-toi pour retrouver ton espace TalentLink.',button:'Se connecter',action:'login'},
 inscription:{title:'Ton parcours commence ici.',intro:'Crée ton compte gratuit. Ton adresse devra être vérifiée avant ta première connexion.',button:'Créer mon compte',action:'register'},
 'mot-de-passe-oublie':{title:'Un nouveau départ.',intro:'Nous t’enverrons un lien pour choisir un nouveau mot de passe.',button:'Envoyer le lien',action:'forgot-password'},
 reinitialiser:{title:'Choisis un nouveau mot de passe.',intro:'Utilise une phrase de passe personnelle d’au moins 12 caractères.',button:'Modifier mon mot de passe',action:'reset-password'},
 verifier:{title:'Confirme ton adresse.',intro:'Valide le lien personnel reçu par e-mail pour activer ta connexion.',button:'Vérifier mon adresse',action:'verify-email'},
 'renvoyer-verification':{title:'Vérifions ton adresse.',intro:'Demande un nouveau lien de vérification. Le lien précédent ne pourra plus être utilisé.',button:'Renvoyer un lien',action:'resend-verification'},
};
export default function AuthForm({mode}:{mode:AuthMode}){
 const content=descriptions[mode];
 const[ready,setReady]=useState(false),[enabled,setEnabled]=useState(false),[registration,setRegistration]=useState(false);
 const[role,setRole]=useState('mentee'),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const[configError,setConfigError]=useState(false),[configRetry,setConfigRetry]=useState(0);
 const[message,setMessage]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{
  setReady(false);setConfigError(false);
  const params=new URLSearchParams(location.search);if(params.get('role')==='mentor')setRole('mentor');
  const fragment=new URLSearchParams(location.hash.slice(1));setToken(current=>current||fragment.get('token')||'');
  if(fragment.has('token'))history.replaceState(null,'',location.pathname+location.search);
  const controller=new AbortController();request('/api/v1/auth/config',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('Configuration indisponible');const data=await response.json();setEnabled(data.enabled===true);setRegistration(data.registrationEnabled===true)}).catch(()=>{if(!controller.signal.aborted)setConfigError(true)}).finally(()=>{if(!controller.signal.aborted)setReady(true)});
  return()=>controller.abort();
 },[configRetry]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError(false);setMessage('');
  const data=new FormData(event.currentTarget);let input:Record<string,unknown>={};
  if(['connexion','inscription','mot-de-passe-oublie','renvoyer-verification'].includes(mode))input.email=data.get('email');
  if(['connexion','inscription','reinitialiser'].includes(mode))input.password=data.get('password');
  if(mode==='inscription')input={...input,role,adultConfirmed:data.get('adultConfirmed')==='on',termsAccepted:data.get('termsAccepted')==='on',privacyAccepted:data.get('privacyAccepted')==='on',mentorCharterAccepted:data.get('mentorCharterAccepted')==='on'};
  if(mode==='verifier'||mode==='reinitialiser')input.token=token;
  try{
   const response=await request(`/api/v1/auth/${content.action}`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(input)});
   const result=await response.json();
   if(!response.ok){setError(true);setMessage(result.message||'Le service est indisponible.');return}
   if(mode==='connexion'){location.assign('/compte/');return}
   setDone(true);setMessage(result.message);
  }catch(e){setError(true);setMessage(e instanceof Error&&e.name==='TimeoutError'?e.message:'Connexion interrompue. Réessaie lorsque le réseau sera disponible.')}finally{setBusy(false)}
 }
 const needsToken=mode==='verifier'||mode==='reinitialiser';
 return <><h1>{content.title}</h1><p>{content.intro}</p>
 {!ready?<p role="status">Préparation de ton espace…</p>:configError?<div className="info" role="alert"><p>La connexion au service n’a pas abouti. Vérifiez votre réseau, puis rechargez la page.</p><button className="button" onClick={()=>setConfigRetry(value=>value+1)}>Réessayer</button></div>:!enabled||(mode==='inscription'&&!registration)?<div className="info" role="status">Les comptes ne sont pas encore ouverts sur cet environnement. Tu peux continuer à découvrir les contenus publics.</div>:needsToken&&!/^[a-f0-9]{64}$/.test(token)?<div className="info" role="alert">Ouvre le lien complet reçu par e-mail. S’il est expiré, demande un nouveau lien.</div>:!done&&<form onSubmit={submit} className="auth-form" aria-busy={busy}>
 {['connexion','inscription','mot-de-passe-oublie','renvoyer-verification'].includes(mode)&&<label className="field">Adresse e-mail<input name="email" type="email" required autoComplete="email" maxLength={254}/></label>}
 {['connexion','inscription','reinitialiser'].includes(mode)&&<label className="field">Mot de passe<input name="password" type="password" required autoComplete={mode==='connexion'?'current-password':'new-password'} minLength={mode==='connexion'?1:12} maxLength={128} aria-describedby={mode==='connexion'?undefined:'password-help'}/>{mode!=='connexion'&&<small id="password-help">Au moins 12 caractères. Une phrase de passe est bienvenue.</small>}</label>}
 {mode==='inscription'&&<><label className="field">Je souhaite<select value={role} onChange={e=>setRole(e.target.value)}><option value="mentee">Être accompagné · Mentoré</option><option value="mentor">Transmettre mon expérience · Mentor</option></select></label><label className="check"><input name="adultConfirmed" type="checkbox" required/>J’ai 18 ans ou plus. Les mineurs restent limités aux contenus publics autorisés.</label><label className="check"><input name="termsAccepted" type="checkbox" required/>J’accepte les <a href="/conditions/" target="_blank" rel="noreferrer">conditions d’utilisation préparatoires</a>.</label><label className="check"><input name="privacyAccepted" type="checkbox" required/>J’ai lu la <a href="/confidentialite/" target="_blank" rel="noreferrer">politique de confidentialité préparatoire</a>.</label>{role==='mentor'&&<label className="check"><input name="mentorCharterAccepted" type="checkbox" required/>J’accepte la <a href="/charte/" target="_blank" rel="noreferrer">charte des mentors</a>. Mon parcours devra être vérifié avant tout accompagnement.</label>}</>}
 <button className="button" type="submit" disabled={busy}>{busy?'Un instant…':content.button}<span>→</span></button></form>}
 {message&&<p className={`auth-message ${error?'error':''}`} role={error?'alert':'status'}>{message}</p>}
 <nav className="auth-links" aria-label="Parcours de compte"><a href="/auth/connexion/">Connexion</a><a href="/auth/inscription/">Créer un compte</a><a href="/auth/mot-de-passe-oublie/">Mot de passe oublié</a><a href="/auth/renvoyer-verification/">Renvoyer la vérification</a></nav>
 <p className="fine">Version de préparation : les parcours privés de mentorat et de messagerie ne sont pas activés.</p></>;
}
