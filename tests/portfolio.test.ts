import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

test('Paper purchases are idempotent; crash/gain scenarios route labelled real-call requests without changing real quotes',async()=>{
 process.env.TEST_DB='memory://';process.env.OMNIDIM_API_KEY='test';process.env.OMNIDIM_AGENT_ID='123';
 const {db,rows,saveSettings}=await import('../server/db.ts');
 const {paperBuy,paperPortfolio,simulatePrice,crossed}=await import('../server/portfolio.ts');
 const {dispatch}=await import('../server/integrations.ts');
 const original=globalThis.fetch;let calls=0;let callContext:any;
 globalThis.fetch=async(input:any,init:any)=>{
 const url=String(input);
 if(url.includes('query1.finance.yahoo.com'))return Response.json({chart:{result:[{meta:{regularMarketPrice:100,regularMarketTime:Math.floor(Date.now()/1000),currency:'INR',exchangeName:'NSE',chartPreviousClose:100},indicators:{quote:[{close:[100,100]}]}}]}});
 if(url.endsWith('/calls/dispatch')){calls++;callContext=JSON.parse(init.body).call_context;return Response.json({success:true,requestId:calls});}
 throw new Error('Unexpected test request');
 };
 try{
 await saveSettings({phone:'+919999999999',callConsent:true,telegramConsent:false,quietStart:'00:00',quietEnd:'00:00',dailyLimit:3});
 const order={id:crypto.randomUUID(),companyId:'tata-motors',quantity:10,crashThreshold:5,gainThreshold:5,alertsEnabled:true};
 await paperBuy(order);await paperBuy(order);
 assert.equal((await paperPortfolio()).positions[0].quantity,10);assert.equal((await rows('SELECT * FROM paper_orders')).length,1);
 assert.equal(crossed(-5,5,5),'crash');assert.equal(crossed(5,5,5),'gain');assert.equal(crossed(4.99,5,5),null);
 assert.equal((await simulatePrice('tata-motors',-4)).triggered,false);assert.equal(calls,0);
 const crash=await simulatePrice('tata-motors',-10);assert.equal(crash.triggered,true);assert.equal(calls,1);
 assert.equal(callContext.simulation,'true');assert.equal(callContext.event_kind,'paper_price');assert.match(callContext.event_summary,/not a real stock-market movement/);
 assert.equal((await simulatePrice('tata-motors',-15)).duplicate,true);assert.equal(calls,1);
 const gain=await simulatePrice('tata-motors',15);assert.equal(gain.blocked,true);assert.match(gain.message,/two minutes/);assert.equal(calls,1);
 await db.query("UPDATE calls SET created_at=now()-interval '3 minutes'");
 await dispatch(gain.eventId!,true);assert.equal(calls,2);
 assert.equal((await rows("SELECT data FROM quotes WHERE symbol='TMCV.NS'"))[0].data.price,100);
 const p=(await paperPortfolio()).positions[0];assert.equal(p.average_price,100);assert.ok(Math.abs(p.simulated_price-115)<1e-8);assert.ok(Math.abs(p.pnl-150)<1e-8);
 await paperBuy({...order,id:crypto.randomUUID(),companyId:'wipro',alertsEnabled:false});await simulatePrice('wipro',-10);assert.equal(calls,2);
 }finally{globalThis.fetch=original;await db.close();}
});
