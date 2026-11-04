import crypto from 'node:crypto';
import {db,rows} from './db.ts';
import {companies} from './catalog.ts';
import {market} from './market.ts';
import {dispatch} from './integrations.ts';

export function movement(price:number,entry:number){return (price-entry)/entry*100;}
export function crossed(percent:number,crash:number,gain:number){return percent<=-crash+1e-8?'crash':percent>=gain-1e-8?'gain':null;}
export async function paperPortfolio(){
 const positions=await rows('SELECT * FROM paper_positions ORDER BY updated_at DESC');
 const alerts=await rows('SELECT p.*,e.data,c.id AS call_id,c.status AS call_status,c.error AS call_error FROM paper_alerts p JOIN events e ON e.id=p.event_id LEFT JOIN calls c ON c.event_id=p.event_id ORDER BY p.created_at DESC LIMIT 30');
 return {positions:positions.map(p=>({...p,invested:p.quantity*p.average_price,value:p.quantity*p.simulated_price,pnl:p.quantity*(p.simulated_price-p.average_price),movement:movement(p.simulated_price,p.average_price)})),orders:await rows('SELECT * FROM paper_orders ORDER BY created_at DESC LIMIT 30'),sales:await rows('SELECT * FROM paper_sales ORDER BY created_at DESC LIMIT 30'),alerts};
}
export async function paperBuy(input:{id:string;companyId:string;quantity:number;crashThreshold:number;gainThreshold:number;alertsEnabled:boolean}){
 if(!companies.some(c=>c.id===input.companyId))throw new Error('Company not found');
 if((await rows('SELECT id FROM paper_orders WHERE id=$1',[input.id])).length)return {ok:true,duplicate:true};
 const co=companies.find(c=>c.id===input.companyId)!;
 const q=(await market()).quotes.find((q:any)=>q.symbol===co.symbol);
 if(!q?.price||!Number.isFinite(q.price)||q.error)throw new Error('A provider quote is required to anchor a paper purchase. Refresh quotes first.');
 await db.transaction(async tx=>{
 const inserted=await tx.query('INSERT INTO paper_orders(id,company_id,quantity,price,quote_time) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',[input.id,input.companyId,input.quantity,q.price,q.updatedAt]);
 if(!inserted.rows.length)return;
 await tx.query(`INSERT INTO paper_positions(company_id,quantity,average_price,simulated_price,crash_threshold,gain_threshold,alerts_enabled,cycle) VALUES($1,$2,$3,$3,$4,$5,$6,(SELECT count(*)::int FROM paper_orders WHERE company_id=$1))
 ON CONFLICT(company_id) DO UPDATE SET average_price=(paper_positions.average_price*paper_positions.quantity+EXCLUDED.average_price*EXCLUDED.quantity)/(paper_positions.quantity+EXCLUDED.quantity),quantity=paper_positions.quantity+EXCLUDED.quantity,simulated_price=EXCLUDED.simulated_price,crash_threshold=EXCLUDED.crash_threshold,gain_threshold=EXCLUDED.gain_threshold,alerts_enabled=EXCLUDED.alerts_enabled,cycle=EXCLUDED.cycle,updated_at=now()`,[input.companyId,input.quantity,q.price,input.crashThreshold,input.gainThreshold,input.alertsEnabled]);
 });
 return {ok:true,price:q.price,quoteTime:q.updatedAt};
}
const simulating=new Set<string>();
export async function simulatePrice(companyId:string,percent:number){
 if(simulating.has(companyId))throw new Error('A scenario for this company is already running.');
 simulating.add(companyId);
 try{
 let eventId:string|null=null,duplicate=false,direction:string|null=null;
 await db.transaction(async tx=>{
 const p=(await tx.query<any>('SELECT * FROM paper_positions WHERE company_id=$1 FOR UPDATE',[companyId])).rows[0];
 if(!p)throw new Error('Buy paper shares in this company first.');
 const simulatedPrice=p.average_price*(1+percent/100);
 const actualPercent=movement(simulatedPrice,p.average_price);
 direction=crossed(actualPercent,p.crash_threshold,p.gain_threshold);
 await tx.query('UPDATE paper_positions SET simulated_price=$2,updated_at=now() WHERE company_id=$1',[companyId,simulatedPrice]);
 if(!direction||!p.alerts_enabled)return;
 const existing=(await tx.query<any>('SELECT event_id FROM paper_alerts WHERE company_id=$1 AND direction=$2 AND cycle=$3',[companyId,direction,p.cycle])).rows[0];
 if(existing){eventId=existing.event_id;duplicate=true;return;}
 eventId='paper-'+crypto.randomUUID();const co=companies.find(c=>c.id===companyId)!;
 const event={id:eventId,companyId,kind:'paper_price',simulated:true,verified:false,title:`SIMULATED: ${co.name} ${direction==='crash'?'falls':'rises'} ${Math.abs(actualPercent).toFixed(2)}%`,category:'Price movement',severity:'High',published:new Date().toISOString(),verification:'Simulation — not a real market move',summary:`This is a paper-portfolio simulation, not a real stock-market movement. ${p.quantity} paper shares of ${co.name} have an average entry price of INR ${p.average_price.toFixed(2)}. The scenario price is INR ${simulatedPrice.toFixed(2)}, a ${actualPercent.toFixed(2)}% change from entry. The user's ${direction==='crash'?p.crash_threshold:p.gain_threshold}% ${direction==='crash'?'fall':'gain'} threshold was crossed. Simulated position P&L: INR ${(p.quantity*(simulatedPrice-p.average_price)).toFixed(2)}. No real shares were bought and no sell order will be placed.`,sourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(co.symbol)}/`,sourceName:'Yahoo Finance entry quote + user-requested simulated scenario',scope:'Paper holdings only. Quote link supports the entry snapshot, not the simulated price movement.',progress:'Not applicable — a simulated price scenario.',paper:{cycle:p.cycle,quantity:p.quantity,entryPrice:p.average_price,scenarioPrice:simulatedPrice,percent:actualPercent,direction}};
 await tx.query('INSERT INTO events(id,company_id,data) VALUES($1,$2,$3)',[eventId,companyId,JSON.stringify(event)]);
 await tx.query('INSERT INTO paper_alerts(event_id,company_id,direction,cycle) VALUES($1,$2,$3,$4)',[eventId,companyId,direction,p.cycle]);
 });
 if(!eventId)return {triggered:false,direction,message:direction?'Price updated; real-call alerts are disabled for this holding.':'Price updated. Neither alert threshold was crossed.'};
 if(duplicate)return {triggered:false,duplicate:true,eventId,message:'This direction has already triggered an alert for this holding. No duplicate call was placed.'};
 try{const call=await dispatch(eventId,true);return {triggered:true,eventId,call,message:'Threshold crossed. A real phone call was dispatched.'};}
 catch(err:any){return {triggered:true,eventId,call:null,message:err.message,blocked:true};}
 }finally{simulating.delete(companyId);}
}
