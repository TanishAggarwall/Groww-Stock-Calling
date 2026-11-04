import {database} from './database-client.ts';
import fs from 'node:fs';
import {companies,seedEvents} from './catalog.ts';
const dataDir=process.env.DATA_DIR||'data';
fs.mkdirSync(dataDir,{recursive:true});
export const db=database(process.env.TEST_DB||`${dataDir}/postgres`);
await db.exec(`
 CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), data jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS companies (id text PRIMARY KEY, data jsonb NOT NULL, monitored boolean DEFAULT true);
 CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, company_id text NOT NULL REFERENCES companies(id), data jsonb NOT NULL, created_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS calls (id text PRIMARY KEY,event_id text NOT NULL REFERENCES events(id),status text NOT NULL,request_id text UNIQUE,provider_call_id text UNIQUE,summary text,transcript text,error text,demo boolean DEFAULT false,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS messages (id text PRIMARY KEY, dedupe_key text UNIQUE NOT NULL, call_id text REFERENCES calls(id),event_id text REFERENCES events(id),status text NOT NULL DEFAULT 'pending',attempts int DEFAULT 0,text text NOT NULL,provider_message_id text,error text,next_attempt_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS quotes (symbol text PRIMARY KEY,data jsonb NOT NULL, fetched_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS runs (id text PRIMARY KEY,status text NOT NULL,details text,created_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS paper_positions (company_id text PRIMARY KEY REFERENCES companies(id),quantity integer NOT NULL CHECK(quantity>0),average_price double precision NOT NULL CHECK(average_price>0),simulated_price double precision NOT NULL CHECK(simulated_price>0),crash_threshold double precision NOT NULL DEFAULT 5,gain_threshold double precision NOT NULL DEFAULT 5,alerts_enabled boolean NOT NULL DEFAULT true,cycle integer NOT NULL DEFAULT 1,updated_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS paper_orders (id text PRIMARY KEY,company_id text NOT NULL REFERENCES companies(id),quantity integer NOT NULL,price double precision NOT NULL,quote_time text NOT NULL,created_at timestamptz DEFAULT now());
 CREATE TABLE IF NOT EXISTS paper_alerts (event_id text PRIMARY KEY REFERENCES events(id),company_id text NOT NULL REFERENCES companies(id),direction text NOT NULL,cycle integer NOT NULL,created_at timestamptz DEFAULT now(),UNIQUE(company_id,direction,cycle));
 CREATE TABLE IF NOT EXISTS paper_sales (call_id text PRIMARY KEY REFERENCES calls(id),company_id text NOT NULL REFERENCES companies(id),quantity integer NOT NULL,entry_price double precision NOT NULL,sale_price double precision NOT NULL,realized_pnl double precision NOT NULL,created_at timestamptz DEFAULT now());
 ALTER TABLE calls ADD COLUMN IF NOT EXISTS paper_action jsonb;
`);
await db.query('INSERT INTO settings(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING',[JSON.stringify({phone:'',callConsent:false,telegramConsent:false,quietStart:'22:00',quietEnd:'08:00',dailyLimit:3,categories:['Environmental','Labour','Governance','Regulatory','Sustainability'],autoMonitor:false,chatId:''})]);
for(const c of companies)await db.query('INSERT INTO companies(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2',[c.id,JSON.stringify(c)]);
for(const e of seedEvents)await db.query('INSERT INTO events(id,company_id,data) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[e.id,e.companyId,JSON.stringify(e)]);
export async function rows<T=any>(q:string,p:any[]=[]):Promise<T[]>{return (await db.query<T>(q,p)).rows;}
export async function settings(){return (await rows('SELECT data FROM settings WHERE id=1'))[0].data;}
export async function saveSettings(data:any){await db.query('UPDATE settings SET data=$1 WHERE id=1',[JSON.stringify(data)]);}
export async function eventById(id:string){return (await rows('SELECT data FROM events WHERE id=$1',[id]))[0]?.data;}
