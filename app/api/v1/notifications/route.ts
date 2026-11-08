import {handleNotifications} from '../../../../src/server/notifications-http.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleNotifications(request,'inbox')}
export async function POST(request:Request){return handleNotifications(request,'inbox')}
