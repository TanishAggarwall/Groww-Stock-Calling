import dotenv from 'dotenv';
dotenv.config({path:'.env.local',quiet:true});dotenv.config({quiet:true});
if(process.env.SECRET_FILE)dotenv.config({path:process.env.SECRET_FILE,quiet:true,override:true});
const {db,rows,settings,saveSettings}=await import('./db.ts');
const {omni,telegram,telegramHealth,saveSecret,configureAgent,registerChat,dispatch,syncCalls,sendPending}=await import('./integrations.ts');
const {market}=await import('./market.ts');
const {monitor}=await import('./monitor.ts');
const {paperPortfolio,paperBuy,simulatePrice}=await import('./portfolio.ts');
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import {z} from 'zod';
import path from 'node:path';
import crypto from 'node:crypto';
const app=express(),port=Number(process.env.PORT||3000);
const cloud=process.env.CLOUD_MODE==='true';
if(cloud&&(!process.env.DASHBOARD_PASSWORD||process.env.DASHBOARD_PASSWORD.length<20))throw new Error('Cloud deployment requires DASHBOARD_PASSWORD of at least 20 characters.');
if(cloud)app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false}));
app.get('/health',(_req,res)=>res.json({status:'ok'}));
if(cloud)app.use((req,res,next)=>{
 const raw=String(req.headers.authorization||'');
 const expected='team-bb:'+process.env.DASHBOARD_PASSWORD;
 const supplied=raw.startsWith('Basic ')?Buffer.from(raw.slice(6),'base64').toString():'';
 if(!crypto.timingSafeEqual(crypto.createHash('sha256').update(supplied).digest(),crypto.createHash('sha256').update(expected).digest())){res.setHeader('WWW-Authenticate','Basic realm="Team BB Stock Calling", charset="UTF-8"');return res.status(401).json({error:'Dashboard login required'});}
 next();
});
app.use('/api',express.json({limit:'32kb'}));
// This single-user local app only accepts its own browser origin and loopback hosts.
app.use('/api',(req,res,next)=>{
 if(!cloud&&!['localhost','127.0.0.1'].includes(req.hostname))return res.status(403).json({error:'Local access only'});
 const origin=req.headers.origin;
 const allowed=['http://localhost:'+port,'http://127.0.0.1:'+port,process.env.FRONTEND_ORIGIN,process.env.APP_URL].filter(Boolean);
 if(origin&&!allowed.includes(origin))return res.status(403).json({error:'Origin rejected'});
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');}
 if(req.method==='OPTIONS')return res.status(204).end();
 if(!['GET','HEAD'].includes(req.method)&&!req.is('application/json'))return res.status(415).json({error:'JSON required'});
 res.setHeader('Cache-Control','no-store');next();
});
app.use('/api',rateLimit({windowMs:60000,limit:100,standardHeaders:true,legacyHeaders:false}));
app.get('/api/state',async(_req,res)=>{
 const s=await settings();const cs=await rows('SELECT data,monitored FROM companies ORDER BY id');
 res.json({settings:s,companies:cs.map(c=>({...c.data,monitored:c.monitored})),events:(await rows('SELECT data FROM events ORDER BY data->>\'published\' DESC')).map(e=>e.data),calls:await rows('SELECT * FROM calls ORDER BY created_at DESC'),messages:await rows('SELECT id,call_id,event_id,status,attempts,error,provider_message_id,created_at FROM messages ORDER BY created_at DESC'),runs:await rows('SELECT * FROM runs ORDER BY created_at DESC LIMIT 5'),integrations:{omniKey:!!process.env.OMNIDIM_API_KEY,agentId:process.env.OMNIDIM_AGENT_ID||null,telegramToken:!!process.env.TELEGRAM_BOT_TOKEN}});
});
const settingsSchema=z.object({phone:z.string().regex(/^$|^\+[1-9]\d{7,14}$/),callConsent:z.boolean(),telegramConsent:z.boolean(),quietStart:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),quietEnd:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),dailyLimit:z.number().int().min(1).max(10),categories:z.array(z.string()).max(10),autoMonitor:z.boolean(),chatId:z.string().regex(/^$|^-?\d+$/)});
app.post('/api/settings',async(req,res)=>{const s=settingsSchema.parse(req.body);await saveSettings({...await settings(),...s});res.json({ok:true});});
app.post('/api/secrets',async(req,res)=>{const d=z.object({key:z.enum(['OMNIDIM_API_KEY','TELEGRAM_BOT_TOKEN']),value:z.string().trim().min(10).max(500).regex(/^[^\r\n]+$/)}).parse(req.body);saveSecret(d.key,d.value);res.json({ok:true});});
app.post('/api/watchlist',async(req,res)=>{const d=z.object({id:z.string(),monitored:z.boolean()}).parse(req.body);await db.query('UPDATE companies SET monitored=$2 WHERE id=$1',[d.id,d.monitored]);res.json({ok:true});});
app.get('/api/market',async(_req,res)=>res.json(await market()));
app.get('/api/portfolio',async(_req,res)=>res.json(await paperPortfolio()));
app.post('/api/portfolio/buy',async(req,res)=>{const d=z.object({id:z.uuid(),companyId:z.string(),quantity:z.number().int().min(1).max(100000),crashThreshold:z.number().min(1).max(90),gainThreshold:z.number().min(1).max(200),alertsEnabled:z.boolean()}).parse(req.body);res.json(await paperBuy(d));});
app.post('/api/portfolio/simulate',async(req,res)=>{const d=z.object({companyId:z.string(),percent:z.number().min(-90).max(200)}).parse(req.body);res.json(await simulatePrice(d.companyId,d.percent));});
app.post('/api/market/refresh',async(_req,res)=>res.json(await market(true)));
app.post('/api/monitor',async(_req,res)=>res.json(await monitor()));
app.post('/api/events/review',async(req,res)=>{
 const d=z.object({id:z.string(),title:z.string().min(10).max(300),summary:z.string().min(40).max(3000),sourceUrl:z.url().startsWith('https://'),sourceName:z.string().min(3).max(150),published:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),category:z.enum(['Environmental','Labour','Governance','Regulatory','Sustainability']),severity:z.enum(['High','Medium','Low']),verification:z.enum(['Company disclosure','Confirmed regulatory action','Reported allegation']),scope:z.string().min(15).max(1000),evidenceNote:z.string().min(30).max(2000),attested:z.literal(true)}).parse(req.body);
 const old=(await rows('SELECT data FROM events WHERE id=$1',[d.id]))[0]?.data;
 if(!old)throw new Error('Research item not found');
 if(old.simulated)throw new Error('A simulated price scenario cannot be reviewed as a real company development.');
 const source=new URL(d.sourceUrl);
 if(source.hostname==='news.google.com')throw new Error('Use the original publisher or regulator URL, not the discovery link.');
 if(!Number.isFinite(Date.parse(d.published))||Date.parse(d.published)>Date.now())throw new Error('Invalid or future publication date');
 await db.query('UPDATE events SET data=$2 WHERE id=$1',[d.id,JSON.stringify({...old,...d,verified:true,reviewedAt:new Date().toISOString(),reviewMethod:'Human source review'})]);res.json({ok:true});
});
app.post('/api/omni/check',async(_req,res)=>{const balance=await omni('/account/balance');res.json({connected:true,balance:balance.balance,minutes:balance.estimated_minutes_remaining,plan:balance.plan?.name,concurrency:balance.concurrency});});
app.post('/api/omni/agent',async(_req,res)=>res.json(await configureAgent()));
app.get('/api/telegram/status',async(_req,res)=>res.json({...telegramHealth,configured:!!process.env.TELEGRAM_BOT_TOKEN,registered:!!(await settings()).chatId}));
app.post('/api/telegram/register',async(_req,res)=>{const result=await registerChat();if(result.registered)await sendPending();res.json(result);});
app.post('/api/telegram/test',async(_req,res)=>{const s=await settings();if(!s.telegramConsent||!s.chatId)throw new Error('Enable Telegram consent and register your private chat first.');const id=crypto.randomUUID();await db.query('INSERT INTO messages(id,dedupe_key,text) VALUES($1,$2,$3)',[id,'test:'+id,'IMPACTCALL\nYour Telegram connection is working. Sourced company-impact summaries will arrive here after your calls.']);await sendPending();res.json((await rows('SELECT status,error,provider_message_id FROM messages WHERE id=$1',[id]))[0]);});
app.post('/api/calls',rateLimit({windowMs:60000,limit:3}),async(req,res)=>{const d=z.object({eventId:z.string(),demo:z.boolean().default(false)}).parse(req.body);res.json(await dispatch(d.eventId,d.demo));});
app.post('/api/calls/sync',async(_req,res)=>{await syncCalls();await sendPending();res.json({ok:true});});
app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found'}));
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
 let message=err instanceof z.ZodError?'Invalid input. Check phone, time and preference fields.':String(err.message||'Request failed');
 for(const key of ['TELEGRAM_BOT_TOKEN','OMNIDIM_API_KEY'])if(process.env[key])message=message.split(process.env[key]!).join('[redacted]');
 res.status(400).json({error:message.slice(0,600)});
});
if(process.argv.includes('--production')){app.use(express.static('dist'));app.get('/{*splat}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));}
else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
// Mark interrupted deliveries as uncertain; never automatically duplicate them after a restart.
await db.query("UPDATE messages SET status='unknown',error='Delivery interrupted; check Telegram before retrying.' WHERE status='sending'");
app.listen(port,cloud?'0.0.0.0':'127.0.0.1',()=>console.log(`Stock Calling ready on port ${port}`));
sendPending().catch(()=>{});
setInterval(()=>{syncCalls().catch(()=>{});sendPending().catch(()=>{});},20000).unref();
setInterval(async()=>{if((await settings()).autoMonitor)monitor().catch(()=>{});},30*60000).unref();
