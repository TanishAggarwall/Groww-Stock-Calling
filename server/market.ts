import {db,rows} from './db.ts';
import {companies} from './catalog.ts';
const indexes=[{symbol:'^NSEI',name:'NIFTY 50'},{symbol:'^BSESN',name:'SENSEX'},{symbol:'^NSEBANK',name:'BANK NIFTY'}];
let busy:Promise<any>|null=null;
export async function market(force=false){
 if(busy)return busy;
 busy=(async()=>{
 const all=[...companies,...indexes];
 const results=await Promise.all(all.map(async c=>{
 const cached=(await rows('SELECT data,fetched_at FROM quotes WHERE symbol=$1',[c.symbol]))[0];
 if(!force&&cached&&Date.now()-new Date(cached.fetched_at).getTime()<60000)return cached.data;
 try{
 const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(c.symbol)}?interval=1d&range=5d`,{headers:{'User-Agent':'ImpactCall/1.0'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Provider HTTP '+r.status);
 const d:any=await r.json(),m=d.chart?.result?.[0]?.meta;
 if(!m||!Number.isFinite(m.regularMarketPrice)||!m.regularMarketTime)throw new Error('No genuine quote available');
 const prev=m.chartPreviousClose||m.previousClose;
 const quote={symbol:c.symbol,name:c.name,price:m.regularMarketPrice,change:prev?((m.regularMarketPrice-prev)/prev)*100:null,currency:m.currency,exchange:m.fullExchangeName||m.exchangeName,updatedAt:new Date(m.regularMarketTime*1000).toISOString(),fetchedAt:new Date().toISOString(),delay:'Provider quote · may be delayed; not a real-time exchange feed',stale:Date.now()-m.regularMarketTime*1000>86400000,provider:'Yahoo Finance',sourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(c.symbol)}/`};
 // chartPreviousClose may cover the requested range: use the latest chart candle's previous daily close.
 const chart=d.chart.result[0];const closes=chart.indicators?.quote?.[0]?.close||[];
 if(closes.length>=2){let i=closes.length-2;while(i>=0&&closes[i]==null)i--;if(i>=0)quote.change=((quote.price-closes[i])/closes[i])*100;}
 await db.query('INSERT INTO quotes(symbol,data,fetched_at) VALUES($1,$2,now()) ON CONFLICT(symbol) DO UPDATE SET data=$2,fetched_at=now()',[c.symbol,JSON.stringify(quote)]);return quote;
 }catch{ return cached?{...cached.data,stale:true,error:'Provider unavailable; showing last fetched quote'}:{symbol:c.symbol,name:c.name,price:null,error:'Quote unavailable from provider',provider:'Yahoo Finance'};}
 }));
 return {quotes:results.filter(x=>!indexes.some(i=>i.symbol===x.symbol)),indexes:results.filter(x=>indexes.some(i=>i.symbol===x.symbol))};
 })();try{return await busy;}finally{busy=null;}
}
