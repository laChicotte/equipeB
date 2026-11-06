import {handleAdministration} from '../../../../../src/server/administration-http.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
type Context={params:Promise<{action:string}>};
export async function GET(request:Request,{params}:Context){return handleAdministration(request,(await params).action)}
