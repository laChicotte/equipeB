import { handleAuth } from '../../../../../src/server/auth-http.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
type Context={params:Promise<{action:string}>};
export async function GET(request:Request,{params}:Context){return handleAuth(request,(await params).action)}
export async function POST(request:Request,{params}:Context){return handleAuth(request,(await params).action)}
