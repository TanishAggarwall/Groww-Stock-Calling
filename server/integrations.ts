import fs from 'node:fs';
import crypto from 'node:crypto';
import {db,rows,settings,saveSettings,eventById} from './db.ts';
import {companies} from './catalog.ts';
import {callPolicy,normalizeStatus} from './policy.ts';
import {processPaperSale,redactDemoPin} from './paper-sell.ts';

export function saveSecret(key:string,value:string){
 if(!/^(OMNIDIM_API_KEY|OMNIDIM_AGENT_ID|TELEGRAM_BOT_TOKEN)$/.test(key)||/[\r\n]/.test(value))throw new Error('Invalid secret');
 if(process.env.CLOUD_MODE==='true'&&process.env.DATABASE_URL){if(process.env[key]===value)return;throw new Error('Update cloud integration credentials in Northflank runtime variables, then redeploy.');}
 process.env[key]=value;
 const secretFile=process.env.SECRET_FILE||'.env.local';
 let text=fs.existsSync(secretFile)?fs.readFileSync(secretFile,'utf8'):'';
 text=text.split('\n').filter(l=>!l.startsWith(key+'=')).join('\n').trim();
 fs.writeFileSync(secretFile,`${text}\n${key}=${value}\n`,{mode:0o600});
}
export async function omni(path:string,body?:any,method?:string){
 if(!process.env.OMNIDIM_API_KEY)throw new Error('Connect your OmniDimension API key in Settings.');
 const r=await fetch('https://omnidim.io/api/v1'+path,{method:method||(body?'POST':'GET'),headers:{Authorization:`Bearer ${process.env.OMNIDIM_API_KEY}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
 if(!r.headers.get('content-type')?.includes('json'))throw new Error(`OmniDimension returned HTTP ${r.status} instead of JSON. Check provider configuration.`);
 const d=await r.json() as any;
 if(!r.ok||d.success===false)throw new Error(`OmniDimension ${r.status}: ${String(d.error||d.message||'Request rejected').slice(0,400)}`);
 return d;
}
export const telegramHealth:{status:string;checkedAt:string|null;error:string|null;username:string|null}={status:'not_checked',checkedAt:null,error:null,username:process.env.TELEGRAM_BOT_USERNAME||null};
let lastRegistrationCheck=0;
export async function telegram(method:string,body:any={}){
 if(!process.env.TELEGRAM_BOT_TOKEN)throw new Error('Add a BotFather token in Settings.');
 let r:Response;
 try{r=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}
 catch(cause:any){
 const code=String(cause.cause?.code||cause.name||'NETWORK_ERROR');
 const error=Object.assign(new Error(`Telegram API connection failed (${code}). Switch network or enable a VPN, then check the connection again.`),{uncertain:!['ENOTFOUND','ECONNREFUSED','ENETUNREACH'].includes(code)});
 Object.assign(telegramHealth,{status:'unreachable',checkedAt:new Date().toISOString(),error:error.message});throw error;
 }
 const d=await r.json() as any;
 if(!d.ok){const e=new Error(`Telegram ${d.error_code}: ${d.description}`) as any;e.retryAfter=d.parameters?.retry_after;Object.assign(telegramHealth,{status:'api_error',checkedAt:new Date().toISOString(),error:e.message});throw e;}
 Object.assign(telegramHealth,{status:'connected',checkedAt:new Date().toISOString(),error:null});
 if(method==='getMe')telegramHealth.username=d.result.username;
 return d.result;
}
export async function registerChat(){
 lastRegistrationCheck=Date.now();
 const s=await settings();
 if(!s.registrationCode){s.registrationCode=crypto.randomBytes(8).toString('hex');await saveSettings(s);}
 let me:any,updates:any;
 try{me=await telegram('getMe');updates=await telegram('getUpdates',{allowed_updates:['message'],timeout:0});}
 catch(err:any){if(process.env.TELEGRAM_BOT_USERNAME)return {registered:!!s.chatId,chatId:s.chatId,url:`https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${s.registrationCode}`,username:process.env.TELEGRAM_BOT_USERNAME,networkError:err.message};throw err;}
 const match=updates.find((u:any)=>u.message?.chat?.type==='private'&&u.message?.text===`/start ${s.registrationCode}`);
 const latest=await settings();
 if(match&&latest.registrationCode===s.registrationCode&&!latest.chatId){latest.chatId=String(match.message.chat.id);await saveSettings(latest);}
 return {registered:!!latest.chatId,chatId:latest.chatId,url:`https://t.me/${me.username}?start=${latest.registrationCode}`,username:me.username};
}
export async function configureAgent(){
 const agent=await omni(process.env.OMNIDIM_AGENT_ID?`/agents/${process.env.OMNIDIM_AGENT_ID}`:'/agents/create',{
 name:'ImpactCall - Company Impact Analyst',call_type:'Outgoing',timezone:'Asia/Kolkata',
 welcome_message:'Hello! This is your AI stock alert assistant. Is now a good time for a brief update?',
 context_breakdown:[{title:'Role and evidence rules',is_enabled:true,body:'Check event_kind first. If event_kind is paper_price, open with: In your demo portfolio, followed by the company, direction and percentage change. Use the phrase demo portfolio once to establish context. Never speak the words simulated or simulation. Use demo portfolio and paper profit or loss instead. Never imply a real market crash or gain. Explain entry price, scenario price, quantity, threshold and paper P&L using call_context. Do not invent a cause. If the user asks to sell the holding, say: Sure, to sell your demo holding, please tell me your four-digit demo PIN, one digit at a time. Never say that paper holdings cannot be sold. Compare the spoken digits with demo_sell_pin from context, but never reveal or repeat the expected PIN. If correct say: PIN verified. Your request to sell all the demo shares will be processed after this call, and the confirmation will come on Telegram. Do NOT claim the sale has already executed while the call is running. If incorrect allow another attempt or cancel; never bypass the PIN. If the user cancels do not request a sale. Never ask for a real brokerage PIN or place an actual brokerage order. The source URL supports only the entry quote. Answer follow-up questions in Hindi, Hinglish or English. For other event kinds: You are ImpactCall. Explain the supplied company-impact development using ONLY the factual call_context. Read company, event_title, event_summary, source_url, publication_date, verification, severity, business_scope and progress. Never invent a violation, financial impact, event, quote, source or current progress. A company disclosure is a claim by the company, not independent verification. Forecasts are not achieved results. Distinguish allegations, confirmed actions and disclosures. If demo=true explain this is a user-requested demonstration about a historical disclosure, not a fresh urgent incident. Mention the date and business scope. Ask permission to continue, explain in 2-3 sentences, allow natural questions, respond in Hindi, Hinglish or English matching the user. If context does not answer a question, say so clearly. Do not give buy/sell advice. If asked to stop, acknowledge and end. Say a sourced Telegram summary will follow only if enabled. Keep under 3 minutes.'}],
 transcriber:{provider:'Soniox',max_call_duration_in_sec:180},
 model:{model:'gpt-4.1-mini',temperature:0.2},
 languages:['English (India)','Hindi']
 },process.env.OMNIDIM_AGENT_ID?'PUT':'POST');
 const id=agent.agent?.id||agent.data?.id||agent.id||agent.agent_id;
 if(!id)throw new Error('Agent response did not include an ID; inspect OmniDimension before retrying.');
 saveSecret('OMNIDIM_AGENT_ID',String(id));return {id};
}
let dispatchBusy=false;
export async function dispatch(eventId:string,demo=false){
 if(dispatchBusy)throw new Error('A call is already being dispatched.');
 dispatchBusy=true;
 try{
 const s=await settings(),e=await eventById(eventId);
 if(!e)throw new Error('Event not found');
 const blocked=callPolicy(s,e,demo);if(blocked)throw new Error(blocked);
 if(!process.env.OMNIDIM_AGENT_ID)throw new Error('Configure the OmniDimension voice agent first.');
 const count=await rows("SELECT count(*)::int AS n FROM calls WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'");
 if(count[0].n>=s.dailyLimit)throw new Error('Daily call limit reached.');
 const recent=await rows("SELECT id FROM calls WHERE created_at > now()-interval '2 minutes'");
 if(recent.length)throw new Error('Please wait two minutes between call attempts.');
 if(!demo&&(await rows('SELECT id FROM calls WHERE event_id=$1 AND demo=false',[eventId])).length)throw new Error('This event has already triggered a call.');
 const id=crypto.randomUUID();
 await db.query('INSERT INTO calls(id,event_id,status,demo) VALUES($1,$2,$3,$4)',[id,eventId,'dispatching',demo]);
 try {
 const response=await omni('/calls/dispatch',{agent_id:Number(process.env.OMNIDIM_AGENT_ID),to_number:s.phone,
 call_context:{company:companies.find(c=>c.id===e.companyId)?.name,event_title:e.kind==='paper_price'?e.title.replace(/SIMULATED/g,'DEMO'):e.title,event_summary:e.kind==='paper_price'?e.summary.replace(/simulated|simulation/gi,'demo'):e.summary,source_url:e.sourceUrl,publication_date:e.published,verification:e.kind==='paper_price'?'Demo portfolio price scenario, not a real market move':e.verification,severity:e.severity,business_scope:e.scope,progress:e.progress,demo:String(demo),event_kind:e.kind||'company_impact',simulation:String(!!e.simulated),paper_holding:e.paper?JSON.stringify(e.paper):'not applicable',demo_sell_pin:e.kind==='paper_price'?(process.env.DEMO_SELL_PIN||'not configured'):'not applicable'},
 metadata:{impactcall_id:id,event_id:eventId},__languages:['English','Hindi']});
 const rid=response.requestId||response.request_id;
 await db.query('UPDATE calls SET status=$2,request_id=$3,updated_at=now() WHERE id=$1',[id,'dispatched',rid?String(rid):null]);
 return {id,status:'dispatched',requestId:rid};
 }catch(err:any){
 const ambiguous=/timeout|fetch failed|aborted/i.test(err.message);
 await db.query('UPDATE calls SET status=$2,error=$3,updated_at=now() WHERE id=$1',[id,ambiguous?'unknown':'failed',ambiguous?'Provider response was not received. Check OmniDimension before another attempt.':err.message]);
 await queueSummary(id);throw err;
 }
 }finally{dispatchBusy=false;}
}
export async function queueSummary(callId:string){
 const c=(await rows('SELECT * FROM calls WHERE id=$1',[callId]))[0],s=await settings();
 if(!c||!s.telegramConsent)return;
 const e=await eventById(c.event_id),company=companies.find(x=>x.id===e.companyId)?.name;
 const text=`${e.simulated?'SIMULATED STOCK PRICE ALERT — REAL CALL':'COMPANY IMPACT ALERT'}\n\nCompany: ${company}\nCategory: ${e.category}\nPriority: ${e.severity}${c.demo?(e.simulated?' (paper-portfolio demo)':' (consented demo call)'):''}\nPublished: ${e.published}\nVerification: ${e.verification}\n\nWhat happened:\n${e.summary}\n\nWhat the AI explained:\n${c.summary||'No conversation summary is available from the provider.'}${c.paper_action?'\n\nPaper sale: '+c.paper_action.message:''}\n\n${e.simulated?'Entry quote source (does not show the simulated move)':'Source'}:\n${e.sourceUrl}\n\nCall status: ${c.status}${c.error?'\n'+c.error:''}\n\nView full details:\n${process.env.APP_URL||'http://localhost:3000'}/?screen=calls\n(Local dashboard link opens on the laptop.)`;
 await db.query("INSERT INTO messages(id,dedupe_key,call_id,event_id,text) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe_key) DO UPDATE SET text=EXCLUDED.text WHERE messages.status='pending' AND messages.attempts=0",[crypto.randomUUID(),`call:${callId}`,callId,e.id,text.slice(0,4000)]);
 const delivery=(await rows('SELECT status FROM messages WHERE dedupe_key=$1',[`call:${callId}`]))[0];
 if(c.paper_action?.status==='executed'&&['sent','sending','unknown'].includes(delivery?.status)){
 await db.query('INSERT INTO messages(id,dedupe_key,call_id,event_id,text) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe_key) DO NOTHING',[crypto.randomUUID(),`paper-sale:${callId}`,callId,e.id,`DEMO PORTFOLIO — SALE CONFIRMATION\n\nCompany: ${company}\n${c.paper_action.message}\n\nThe sale was authorized during your phone conversation with your demo PIN.\n\nView paper portfolio:\n${process.env.APP_URL||'http://localhost:3000'}/?screen=portfolio`]);
 }
}
let messageBusy=false;
export async function sendPending(){
 if(messageBusy)return;messageBusy=true;
 try{
 let s=await settings();if(!s.telegramConsent||!process.env.TELEGRAM_BOT_TOKEN)return;
 if(!s.chatId){
 if(Date.now()-lastRegistrationCheck<30000)return;
 const registration=await registerChat();if(!registration.registered)return;
 s=await settings();
 }
 const messages=await rows("SELECT * FROM messages WHERE status IN ('pending','retry') AND attempts<3 AND next_attempt_at<=now() ORDER BY created_at LIMIT 5");
 for(const m of messages){
 await db.query("UPDATE messages SET status='sending',attempts=attempts+1 WHERE id=$1",[m.id]);
 try{const r=await telegram('sendMessage',{chat_id:s.chatId,text:m.text,link_preview_options:{is_disabled:true}});await db.query("UPDATE messages SET status='sent',provider_message_id=$2,error=null WHERE id=$1",[m.id,String(r.message_id)]);}
 catch(err:any){const ambiguous=err.uncertain||/timeout|fetch failed|aborted/i.test(err.message);const status=ambiguous?'unknown':m.attempts>=2?'failed':'retry';await db.query("UPDATE messages SET status=$2,error=$3,next_attempt_at=now()+($4 * interval '1 second') WHERE id=$1",[m.id,status,ambiguous?'Delivery uncertain; not retried to avoid duplicates. '+err.message:err.message,err.retryAfter||Math.pow(2,m.attempts+1)*30]);}
 }
 }finally{messageBusy=false;}
}
export async function syncCalls(){
 if(!process.env.OMNIDIM_API_KEY||!process.env.OMNIDIM_AGENT_ID)return;
 const pending=await rows("SELECT * FROM calls WHERE status IN ('dispatched','dispatching','unknown') OR (status='completed' AND (summary IS NULL OR (paper_action IS NULL AND event_id IN (SELECT id FROM events WHERE data->>'kind'='paper_price')))) ORDER BY created_at DESC");
 if(!pending.length)return;
 const result=await omni(`/calls/logs?pageno=1&pagesize=150&agentid=${process.env.OMNIDIM_AGENT_ID}`);
 for(const c of pending){
 const match=(result.call_log_data||[]).find((x:any)=>x.metadata?.impactcall_id===c.id||(c.request_id&&String(x.call_request_id?.id||x.call_request_id)===c.request_id));
 if(!match)continue;
 const status=normalizeStatus(match.call_status);if(!status)continue;
 const rawTranscript=String(match.call_conversation||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'');
 const event=await eventById(c.event_id);
 const paperAction=await processPaperSale(c.id,event,rawTranscript);
 const transcript=redactDemoPin(rawTranscript,process.env.DEMO_SELL_PIN||'');
 const agentTurns=transcript.split(/(?:^|\n)LLM:/).slice(1).map((t:string)=>t.split(/(?:\n)?User:/i)[0].trim());
 const summaryText=match.call_report?.summary||match.summary||match.sentiment_analysis_details||(agentTurns.length?'Excerpt from the actual conversation: '+agentTurns.slice(1,3).join(' ').slice(0,1800):null);
 const summary=summaryText?redactDemoPin(summaryText,process.env.DEMO_SELL_PIN||''):null;
 await db.query('UPDATE calls SET status=$2,provider_call_id=$3,summary=$4,transcript=$5,paper_action=COALESCE($6::jsonb,paper_action),error=null,updated_at=now() WHERE id=$1',[c.id,status,String(match.id),summary,transcript,paperAction?JSON.stringify(paperAction):null]);
 await queueSummary(c.id);
 }
 await sendPending();
}
