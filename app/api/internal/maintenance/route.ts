import {handleMaintenance} from '../../../../src/server/maintenance.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){return handleMaintenance(request)}
