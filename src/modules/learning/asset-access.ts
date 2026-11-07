import type {Sql} from '../../server/database.ts';
import {AuthError} from '../identity/errors.ts';
export async function ownedAsset(sql:Sql,userId:string,assetId:string,kind:'photo'|'document'){
 const [asset]=await sql.query("SELECT id FROM stored_asset WHERE id=$1 AND owner_id=$2 AND kind=$3 AND status='ready' FOR UPDATE",[assetId,userId,kind]);
 if(!asset)throw new AuthError(404,'not_found','Ce fichier n’est pas disponible.');
}
