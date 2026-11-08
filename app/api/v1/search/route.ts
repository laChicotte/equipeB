import {handleSearch} from '../../../../src/server/search-http.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){return handleSearch(request)}
export async function POST(request:Request){return handleSearch(request)}
