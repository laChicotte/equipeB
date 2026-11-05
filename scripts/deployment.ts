import {existsSync} from 'node:fs';
import {deploymentReadiness} from '../src/server/deployment-readiness.ts';
import {verifySmtpConnection} from '../src/server/mail.ts';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const command=process.argv[2]||'preview';
if(command==='smtp'){
  try{await verifySmtpConnection();console.log('SMTP : connexion, TLS et authentification vérifiés. Aucun message envoyé. L’acceptation de MAIL_FROM reste à tester avec un destinataire explicitement autorisé.')}
  catch{console.error('SMTP non vérifié. Renseignez le service choisi et sa configuration privée. Aucun message envoyé, aucun identifiant affiché.');process.exitCode=1}
}else if(command==='preview'||command==='accounts'){
  const result=deploymentReadiness(process.env,command);
  for(const check of result.checks)console.log(`${check.ok?'OK':'À CONFIGURER'} : ${check.id}`);
  console.log(command==='preview'?'Contrôle de préversion : aucun compte réel ne sera ouvert.':'Contrôle local uniquement : les connexions PostgreSQL/SMTP et l’hébergement HTTPS doivent aussi être vérifiés.');
  if(!result.ok)process.exitCode=1;
}else{console.error('Commande attendue : preview, accounts ou smtp.');process.exitCode=1}
