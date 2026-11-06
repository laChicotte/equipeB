import {getDatabase} from '../src/server/database.ts';
import {purgeExpiredGuestAttempts} from '../src/modules/play/retention.ts';
if(process.argv[2]!=='--expired-guests')throw new Error('Explicit --expired-guests argument required');
process.loadEnvFile('.env.local');
const db=await getDatabase();
try{console.log('Parties visiteurs expirées supprimées : '+await purgeExpiredGuestAttempts(db))}
catch{console.error('Purge non confirmée. Aucun identifiant affiché.');process.exitCode=1}
finally{await db.close()}
