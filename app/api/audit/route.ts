export const runtime='nodejs';
import {z} from 'zod';
import {auditDb} from '@/lib/audit-db';
import {notifyAudit} from '@/lib/audit-notification';
const schema=z.object({requestId:z.string().uuid(),name:z.string().trim().min(2).max(100),company:z.string().trim().min(2).max(150),email:z.string().trim().email().max(254),phone:z.string().trim().max(30).refine(v=>!v||/^[+0-9() .-]{6,30}$/.test(v)),sector:z.string().trim().min(1).max(120),need:z.string().trim().min(20).max(5000),solution:z.string().trim().min(1).max(150),consent:z.literal(true),website:z.string().max(0)});
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function POST(request:Request){
const origin=request.headers.get('origin');const allowedOrigins=['https://neovaflowai.com'];if(!process.env.RENDER){const port=new URL(request.url).port||process.env.PORT||'3000';allowedOrigins.push(`http://localhost:${port}`,`http://127.0.0.1:${port}`);}if(process.env.RENDER_EXTERNAL_URL)allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);if(!origin||!allowedOrigins.includes(origin))return reply({error:'Origine de la demande non autorisée.'},403);
if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Format non pris en charge.'},415);
if(Number(request.headers.get('content-length')||0)>20000)return reply({error:'Demande trop volumineuse.'},413);
let data;try{const raw=await request.text();if(Buffer.byteLength(raw,'utf8')>20000)return reply({error:'Demande trop volumineuse.'},413);data=schema.safeParse(JSON.parse(raw));}catch{return reply({error:'Vérifiez les informations saisies.'},400)}
if(!data.success)return reply({error:'Vérifiez les champs : nom, entreprise, e-mail valide, secteur et besoin de 20 caractères minimum. Votre accord est nécessaire.'},400);
const d=data.data;
try{const db=auditDb();const existing=await db.prepare('SELECT name,company,email,phone,sector,need,solution FROM audit_requests WHERE id = ?').bind(d.requestId).first<Record<string,string|null>>();if(existing){if(['name','company','email','phone','sector','need','solution'].some(k=>existing[k]!== (k==='email'?d.email.toLowerCase():k==='phone'?d.phone||null:d[k as keyof typeof d])))return reply({error:'Cette référence correspond à une autre demande. Rechargez la page avant de réessayer.'},409);const notificationSent=await notifyAudit(d.requestId);return reply({notificationSent,reference:'NT-'+d.requestId.slice(0,8).toUpperCase()});}
const now=Date.now(),window=Math.floor(now/3600000);const ip=process.env.RENDER?request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown':'local';const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${window}:${ip}`));const key=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
await db.prepare('DELETE FROM audit_rate_limits WHERE expires_at < ?').bind(now).run();
const rate=await db.prepare('INSERT INTO audit_rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count').bind(key,(window+1)*3600000).first<{count:number}>();if(rate&&rate.count>5)return reply({error:'Trop de demandes rapprochées. Merci de réessayer dans une heure.'},429);
await db.prepare('INSERT OR IGNORE INTO audit_requests (id,name,company,email,phone,sector,need,solution,consent_version,created_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(d.requestId,d.name,d.company,d.email.toLowerCase(),d.phone||null,d.sector,d.need,d.solution,'2026-10-contact-v1',now,'new').run();
const notificationSent=await notifyAudit(d.requestId);
return reply({notificationSent,reference:'NT-'+d.requestId.slice(0,8).toUpperCase()},201);
}catch(err){console.error('Audit persistence failed',err instanceof Error?err.name:'unknown');return reply({error:'L’enregistrement est temporairement indisponible. Vos informations restent dans le formulaire. Merci de réessayer.'},503)}
}
