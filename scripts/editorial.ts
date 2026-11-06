import {readFile} from 'node:fs/promises';
import {editorialPackSchema,importEditorialPack} from '../src/modules/play/editorial.ts';
import {getDatabase} from '../src/server/database.ts';
import type {Account} from '../src/modules/identity/access.ts';
const pack=editorialPackSchema.parse(JSON.parse(await readFile('editorial/launch-quizzes.v1.json','utf8')));
if(!process.argv.includes('--apply')){console.log('Lot à relire : '+pack.games.length+' quiz, '+pack.games.reduce((n,g)=>n+g.questions.length,0)+' questions. Aucun accès en base, aucune publication.');for(const g of pack.games)console.log(g.title+' — '+g.questions.length+' questions — '+g.category);}
else{
 process.loadEnvFile('.env.local');if(process.env.DB_DRIVER==='pglite')throw Error('Explicit PostgreSQL import only');
 const index=process.argv.indexOf('--admin-email'),email=index>=0?process.argv[index+1]:undefined;if(!email)throw Error('An existing administrator email is required');const db=await getDatabase();
 try{const [u]=await db.query<{id:string;role:string}>("SELECT id,role FROM app_user WHERE lower(email)=lower($1) AND role='admin' AND disabled_at IS NULL AND email_verified_at IS NOT NULL",[email]);if(!u)throw Error('Administrator unavailable');const result=await importEditorialPack(db,u as Account,pack);console.log(JSON.stringify(result));console.log('Questions soumises uniquement. Aucun jeu publié, aucun compte créé, aucune approbation enregistrée.');}
 catch{console.error('Import éditorial refusé ou indisponible. Aucune publication effectuée, aucun identifiant affiché.');process.exitCode=1}finally{await db.close()}
}
