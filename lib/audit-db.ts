import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
let connection: DatabaseSync | undefined;
export function auditDb(){
  if(!connection){
    const path=process.env.AUDIT_DB_PATH || './data/audits.sqlite';
    if(process.env.RENDER && !path.startsWith('/var/data/')) throw new Error('A persistent Render disk is required');
    mkdirSync(dirname(path),{recursive:true});
    connection=new DatabaseSync(path);
    connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS audit_requests (id TEXT PRIMARY KEY,name TEXT NOT NULL,company TEXT NOT NULL,email TEXT NOT NULL,phone TEXT,sector TEXT NOT NULL,need TEXT NOT NULL,solution TEXT NOT NULL,consent_version TEXT NOT NULL,created_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'new');
      CREATE TABLE IF NOT EXISTS audit_rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit_notifications (audit_id TEXT PRIMARY KEY,sent_at INTEGER,lease_until INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0);`);
  }
  return {prepare(sql:string){const statement=connection!.prepare(sql);return {bind(...values:(string|number|null)[]){return {async first<T=Record<string,unknown>>(){return (statement.get(...values) as T|undefined)??null},async all<T=Record<string,unknown>>(){return statement.all(...values) as T[]},async run(){return statement.run(...values)}}}}}};
}
