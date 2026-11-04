import crypto from 'node:crypto';
import {XMLParser} from 'fast-xml-parser';
import {db,rows,settings} from './db.ts';
import {dispatch,sendPending} from './integrations.ts';
let busy=false;
export async function monitor(){
 if(busy)return {status:'running'};busy=true;
 const id=crypto.randomUUID();let found=0,failures=0;
 try{
 const watched=await rows('SELECT data FROM companies WHERE monitored=true');
 const s=await settings();
 for(const {data:c} of watched){
 try{
 const url=`https://news.google.com/rss/search?q=${encodeURIComponent('"'+c.name+'" (environment OR labour OR governance OR regulator OR sustainability) when:30d')}&hl=en-IN&gl=IN&ceid=IN:en`;
 const res=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!res.ok)throw new Error('Feed unavailable');
 const parsed=new XMLParser().parse(await res.text());let items=parsed.rss?.channel?.item||[];if(!Array.isArray(items))items=[items];
 for(const item of items.slice(0,3)){
 if(!item.title||!item.link||!item.pubDate)continue;
 const eid=crypto.createHash('sha256').update(c.id+item.link).digest('hex').slice(0,24);
 const e={id:eid,companyId:c.id,title:String(item.title),category:'Research',severity:'Low',published:new Date(item.pubDate).toISOString().slice(0,10),summary:'Discovered news headline awaiting source review. Open the publisher article to confirm the claim, business scope and severity. This item cannot trigger a phone call.',sourceUrl:String(item.link),sourceName:typeof item.source==='string'?item.source:item.source?.['#text']||'News discovery',verification:'Unreviewed news lead',verified:false,scope:'Not yet verified'};
 const inserted=await rows('INSERT INTO events(id,company_id,data) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id',[eid,c.id,JSON.stringify(e)]);found+=inserted.length;
 }
 }catch{failures++;}
 }
 if(s.autoMonitor){
 const events=await rows("SELECT e.data FROM events e JOIN companies c ON c.id=e.company_id WHERE c.monitored=true AND e.data->>'verified'='true'");
 for(const {data:e}of events){
 if(!s.categories.includes(e.category))continue;
 // Do not notify for historical disclosures during recurring monitoring.
 if(Date.now()-new Date(e.published).getTime()>7*86400000)continue;
 if(e.severity==='High'){try{await dispatch(e.id);}catch{/* policy refusal, retained in next run */}}
 else if(e.severity==='Medium'&&s.telegramConsent)await db.query('INSERT INTO messages(id,dedupe_key,event_id,text) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[crypto.randomUUID(),`event:${e.id}`,e.id,`IMPACTCALL — COMPANY IMPACT ALERT\n\n${e.title}\nPriority: Medium\n${e.summary}\nSource: ${e.sourceUrl}`]);
 }
 await sendPending();
 }
 const details=`${found} new research leads; ${failures} unavailable feeds. News leads require review; no unverified calls.`;
 await db.query('INSERT INTO runs(id,status,details) VALUES($1,$2,$3)',[id,failures?'partial':'complete',details]);return {status:failures?'partial':'complete',found,details};
 }finally{busy=false;}
}
