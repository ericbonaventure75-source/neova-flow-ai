import {auditDb} from './audit-db';
import {notifyAudit} from './audit-notification';
let running=false;
export async function retryPendingAudits(){
  if(running || !process.env.AUDIT_RELAY_URL || !process.env.AUDIT_RELAY_KEY)return;
  running=true;
  try {
    const db=auditDb();
    const rows=await db.prepare(`SELECT a.id FROM audit_requests a LEFT JOIN audit_notifications n ON a.id=n.audit_id
      WHERE n.sent_at IS NULL AND COALESCE(n.lease_until,0) < ? AND COALESCE(n.attempts,0) < 100
      ORDER BY a.created_at LIMIT 10`).bind(Date.now()).all<{id:string}>();
    for(const row of rows) await notifyAudit(row.id);
  } catch {console.error('Audit retry temporarily unavailable');}
  finally {running=false;}
}
