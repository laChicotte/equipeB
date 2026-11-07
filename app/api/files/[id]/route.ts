import {handleAssets} from '../../../../src/server/assets-http.ts';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){return handleAssets(r,(await params).id)}
