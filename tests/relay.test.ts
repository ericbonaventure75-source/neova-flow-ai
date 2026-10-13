import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHmac} from 'node:crypto';
import {auditDb} from '../lib/audit-db.ts';
import {notifyAudit} from '../lib/audit-notification.ts';
test('signed relay, duplicate suppression, and retry after rejection',async()=>{
  process.env.AUDIT_DB_PATH=join(mkdtempSync(join(tmpdir(),'neova-relay-')),'audits.sqlite');
  process.env.AUDIT_RELAY_URL='https://script.google.com/macros/s/test/exec';
  process.env.AUDIT_RELAY_KEY='local-test-key-not-a-production-secret';
  const db=auditDb();
  for(const id of ['one','two'])await db.prepare('INSERT INTO audit_requests (id,name,company,email,sector,need,solution,consent_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,'Test','Company','test@example.com','Test','A sufficiently long need','Test','v1',Date.now()).run();
  const originalFetch=globalThis.fetch;
  let calls=0;let accepted=true;
  globalThis.fetch=async(_input,init)=>{
    calls++;
    const {payload,signature}=JSON.parse(String(init?.body));
    assert.equal(signature,createHmac('sha256',process.env.AUDIT_RELAY_KEY!).update(payload).digest('hex'));
    assert.equal(JSON.parse(payload).email,'test@example.com');
    return Response.json({ok:accepted});
  };
  try{
    assert.equal(await notifyAudit('one'),true);
    assert.equal(await notifyAudit('one'),true);
    assert.equal(calls,1);
    accepted=false;assert.equal(await notifyAudit('two'),false);
    const pending=await db.prepare('SELECT sent_at,lease_until FROM audit_notifications WHERE audit_id=?').bind('two').first<{sent_at:number|null;lease_until:number}>();
    assert.equal(pending?.sent_at,null);assert.equal(pending?.lease_until,0);
    accepted=true;assert.equal(await notifyAudit('two'),true);
    delete process.env.AUDIT_RELAY_KEY;assert.equal(await notifyAudit('missing-config'),false);
  }finally{globalThis.fetch=originalFetch;}
});
