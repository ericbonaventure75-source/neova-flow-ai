export const dynamic='force-dynamic';
export function GET(){return Response.json({ok:true},{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}})}
