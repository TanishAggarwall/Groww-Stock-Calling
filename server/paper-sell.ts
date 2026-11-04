import crypto from 'node:crypto';
import {db} from './db.ts';

function equalPin(a:string,b:string){return crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(),crypto.createHash('sha256').update(b).digest());}
function spokenDigitGroups(text:string){
 const digits:Record<string,string>={zero:'0',oh:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9','शून्य':'0','जीरो':'0','एक':'1','दो':'2','तीन':'3','चार':'4','पांच':'5','पाँच':'5','छह':'6','सात':'7','आठ':'8','नौ':'9'};
 let normal=text.toLowerCase().replace(/double\s+(\w+)/g,'$1 $1').replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x966));
 normal=normal.replace(/[\p{L}\p{M}]+/gu,word=>digits[word]??word);
 return (normal.match(/\d(?:[\s,.-]*\d)*/g)||[]).map(s=>s.replace(/\D/g,''));
}
export function spokenPinCandidates(text:string){return spokenDigitGroups(text).filter(s=>s.length===4);}
export function saleAuthorization(transcript:string,pin:string){
 let requested=false,authorized=false,pinPrompted=false,sellOffered=false,pinBuffer='';
 const segments=transcript.split(/(?:^|\n)\s*(user|LLM|assistant):/i);
 for(let i=1;i<segments.length;i+=2){
 const actor=segments[i].toLowerCase(),turn=segments[i+1]||'';
 if(actor!=='user'){
 if(/\bsell\b|बेच/i.test(turn)&&/\?|would you like|shall i|do you want|क्या/i.test(turn))sellOffered=true;
 if(requested&&/\bpin\b|पिन/i.test(turn))pinPrompted=true;continue;
 }
 if(/\b(?:cancel|do not sell|don't sell|dont sell|stop selling)\b|मत बेच|बेचना मत|bechna mat/i.test(turn)){requested=false;authorized=false;sellOffered=false;pinBuffer='';continue;}
 const explicit=/\bsell\b|\bbech\w*\b|बेच/i.test(turn);
 const accepted=sellOffered&&/\b(?:yes|yeah|yep|sure|okay|ok|haan|han)\b|हाँ|हां/i.test(turn)&&!/^\s*(?:no|nah|nahi)\b|नहीं/i.test(turn);
 sellOffered=false;
 if(explicit||accepted){requested=true;authorized=false;pinPrompted=false;pinBuffer='';}
 if(requested&&pinPrompted){
 const digits=spokenDigitGroups(turn).join('');
 if(digits){
 if(digits.length===4||pinBuffer.length>=4)pinBuffer=digits;else pinBuffer+=digits;
 authorized=pinBuffer.length===4&&equalPin(pinBuffer,pin);
 if(pinBuffer.length>4)pinBuffer='';
 }
 }
 }
 return {requested,authorized};
}
export function redactDemoPin(text:string,pin:string){
 if(!pin)return text;
 let prompting=false;
 return text.split('\n').map(line=>{
 if(/^(?:LLM|assistant):/i.test(line)&&/\bpin\b|पिन/i.test(line))prompting=!/verified|सत्यापित/i.test(line);
 if(prompting&&/^user:/i.test(line)&&spokenDigitGroups(line).length)return 'User: [Demo PIN entry redacted]';
 return spokenPinCandidates(line).some(p=>equalPin(p,pin))?'[Demo PIN entry redacted]':line;
 }).join('\n');
}
export async function processPaperSale(callId:string,event:any,transcript:string){
 if(event.kind!=='paper_price'||!event.simulated)return null;
 const pin=process.env.DEMO_SELL_PIN||'';if(!/^\d{4}$/.test(pin))return null;
 const auth=saleAuthorization(transcript,pin);if(!auth.requested)return {status:'no_action',message:'No paper sale was requested during this call.'};
 if(!auth.authorized)return {status:'not_authorized',message:'Paper sale was not executed: a correct demo PIN was not provided after the sell request.'};
 return db.transaction(async tx=>{
 const call=(await tx.query<any>('SELECT paper_action FROM calls WHERE id=$1 FOR UPDATE',[callId])).rows[0];
 if(call?.paper_action?.status==='executed')return call.paper_action;
 const p=(await tx.query<any>('SELECT * FROM paper_positions WHERE company_id=$1 FOR UPDATE',[event.companyId])).rows[0];
 if(!p)return {status:'no_position',message:'No open paper holding remains to sell.'};
 if(p.cycle!==event.paper?.cycle)return {status:'position_changed',message:'Paper holding changed after this alert. No sale was executed; use a fresh alert for the current holding.'};
 const price=event.paper.scenarioPrice,quantity=p.quantity,pnl=quantity*(price-p.average_price);
 await tx.query('INSERT INTO paper_sales(call_id,company_id,quantity,entry_price,sale_price,realized_pnl) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[callId,event.companyId,quantity,p.average_price,price,pnl]);
 await tx.query('DELETE FROM paper_positions WHERE company_id=$1',[event.companyId]);
 const result={status:'executed',quantity,price,pnl,message:`Demo PIN verified. Sold all ${quantity} paper shares at INR ${price.toFixed(2)}. Realized paper P&L: INR ${pnl.toFixed(2)}. No real brokerage trade was placed.`};
 await tx.query('UPDATE calls SET paper_action=$2 WHERE id=$1',[callId,JSON.stringify(result)]);return result;
 });
}
