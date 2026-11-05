import { existsSync } from 'node:fs';
import { getDatabase } from '../src/server/database.ts';
import { migrate } from '../src/server/migrations.ts';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
const command=process.argv[2];
try{
  const db=await getDatabase();
  try{
    if(command==='check'){
      const [row]=await db.query<{version:string}>('SELECT version()');
      console.log('Connexion PostgreSQL réussie.');console.log(row.version);
    }else if(command==='migrate'){
      const applied=await migrate(db);console.log(applied.length?`Migrations appliquées : ${applied.join(', ')}`:'Migrations déjà à jour.');
    }else{throw new Error('Use check or migrate')}
  }finally{await db.close()}
}catch(error){
  // Do not echo a connection URL, user identifier, or database error containing values.
  console.error('Opération impossible. Vérifiez la connexion, les droits du schéma talentlink et la configuration locale. Aucun secret n’a été affiché.');process.exitCode=1;
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'UNCLASSIFIED';
  if(/^[A-Z0-9_]{2,64}$/.test(code))console.error(`Code technique : ${code}`);
}
