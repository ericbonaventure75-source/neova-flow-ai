import {auditDb} from './audit-db.ts';

type Audit = {id:string;name:string;company:string;email:string;phone:string|null;sector:string;need:string;solution:string};

// Notification failures never undo a saved audit. A lease prevents simultaneous sends.
export async function notifyAudit(id:string):Promise<boolean>{
  try {
    const settings=process.env;
    if(!settings.AUDIT_RELAY_URL||!settings.AUDIT_RELAY_KEY)throw new Error('Missing relay');
    const url=new URL(settings.AUDIT_RELAY_URL);
    if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname))throw new Error('Invalid relay');
    const db=auditDb();
    await db.prepare('INSERT OR IGNORE INTO audit_notifications (audit_id) VALUES (?)').bind(id).run();
    const now=Date.now();
    const claimed=await db.prepare('UPDATE audit_notifications SET lease_until = ?, attempts = attempts + 1 WHERE audit_id = ? AND sent_at IS NULL AND lease_until < ? RETURNING audit_id').bind(now+60000,id,now).first();
    if(!claimed){const existing=await db.prepare('SELECT sent_at FROM audit_notifications WHERE audit_id = ?').bind(id).first<{sent_at:number|null}>();return Boolean(existing?.sent_at);}
    try {
      const audit=await db.prepare('SELECT id,name,company,email,phone,sector,need,solution FROM audit_requests WHERE id = ?').bind(id).first<Audit>();
      if(!audit)throw new Error('Missing audit');
      const payload=JSON.stringify({...audit,timestamp:Date.now()});
      const encoder=new TextEncoder();
      const key=await crypto.subtle.importKey('raw',encoder.encode(settings.AUDIT_RELAY_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const signed=await crypto.subtle.sign('HMAC',key,encoder.encode(payload));
      const signature=Array.from(new Uint8Array(signed),b=>b.toString(16).padStart(2,'0')).join('');
      const result=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload,signature}),signal:AbortSignal.timeout(12000)});
      if(!result.ok)throw new Error('Relay HTTP error');
      const response=await result.json() as {ok?:boolean};
      if(response.ok!==true)throw new Error('Relay rejected notification');
      await db.prepare('UPDATE audit_notifications SET sent_at = ?, lease_until = 0 WHERE audit_id = ?').bind(Date.now(),id).run();
      return true;
    }catch(error){
      await db.prepare('UPDATE audit_notifications SET lease_until = 0 WHERE audit_id = ? AND sent_at IS NULL').bind(id).run();
      throw error;
    }
  }catch{
    console.error('Audit notification pending');
    return false;
  }
}
