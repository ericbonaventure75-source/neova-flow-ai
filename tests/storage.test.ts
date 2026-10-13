import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('audit records persist across processes, unique IDs prevent duplicates, and limits increment',()=>{
  const folder=mkdtempSync(join(tmpdir(),'neova-'));
  const env={...process.env,AUDIT_DB_PATH:join(folder,'audits.sqlite')};
  const moduleUrl=new URL('../lib/audit-db.ts',import.meta.url).href;
  const first=spawnSync(process.execPath,['--input-type=module','-e',`import {auditDb} from ${JSON.stringify(moduleUrl)};const db=auditDb();await db.prepare('INSERT OR IGNORE INTO audit_requests (id,name,company,email,sector,need,solution,consent_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind('test','Test','Company','test@example.com','Test','A sufficiently long need','Test','v1',1).run();await db.prepare('INSERT OR IGNORE INTO audit_requests (id,name,company,email,sector,need,solution,consent_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind('test','Test','Company','test@example.com','Test','A sufficiently long need','Test','v1',1).run();`],{env,encoding:'utf8'});
  assert.equal(first.status,0,first.stderr);
  const second=spawnSync(process.execPath,['--input-type=module','-e',`import {auditDb} from ${JSON.stringify(moduleUrl)};const db=auditDb();console.log(JSON.stringify(await db.prepare('SELECT count(*) AS count FROM audit_requests').bind().first()));await db.prepare('INSERT INTO audit_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind('ip',100).run();await db.prepare('INSERT INTO audit_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind('ip',100).run();console.log(JSON.stringify(await db.prepare('SELECT count FROM audit_rate_limits WHERE key=?').bind('ip').first()));`],{env,encoding:'utf8'});
  assert.equal(second.status,0,second.stderr);
  assert.deepEqual(second.stdout.trim().split('\n').map(line=>JSON.parse(line)),[{count:1},{count:2}]);
  rmSync(folder,{recursive:true,force:true});
});
