export const dynamic='force-dynamic';
export async function GET(){return Response.json({enabled:process.env.ASSETS_ENABLED==='true'},{headers:{'Cache-Control':'no-store'}})}
