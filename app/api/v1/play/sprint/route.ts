import {handleSprint} from '../../../../../src/server/sprint-http.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=90;
export async function GET(request:Request){return handleSprint(request)}
export async function POST(request:Request){return handleSprint(request)}
