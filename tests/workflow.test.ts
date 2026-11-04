import test from 'node:test';
import assert from 'node:assert/strict';
import {inQuietHours,callPolicy} from '../server/policy.ts';

test('India quiet hours cover midnight and boundaries correctly',()=>{
 assert.equal(inQuietHours('22:00','08:00',new Date('2026-11-04T16:30:00Z')),true);
 assert.equal(inQuietHours('22:00','08:00',new Date('2026-11-04T02:30:00Z')),false);
 assert.equal(inQuietHours('10:00','12:00',new Date('2026-11-04T05:00:00Z')),true);
 assert.equal(inQuietHours('00:00','00:00'),false);
});
test('Consent and verification apply even to an explicitly requested demo',()=>{
 const s={phone:'+919999999999',callConsent:true,quietStart:'22:00',quietEnd:'08:00'},now=new Date('2026-11-04T07:00:00Z');
 assert.match(callPolicy({...s,callConsent:false},{verified:true,severity:'High'},true,now)!,/consent/);
 assert.match(callPolicy(s,{verified:false,severity:'High'},true,now)!,/verified/);
 assert.match(callPolicy(s,{verified:true,severity:'Medium'},false,now)!,/high-priority/);
 assert.equal(callPolicy(s,{verified:true,severity:'Medium'},true,now),null);
});
test('Dispatch → correlated provider result → actual transcript summary → exactly one Telegram delivery',async()=>{
 process.env.TEST_DB='memory://';process.env.OMNIDIM_API_KEY='test-key';process.env.OMNIDIM_AGENT_ID='123';process.env.TELEGRAM_BOT_TOKEN='test-token';
 const {db,rows,saveSettings}=await import('../server/db.ts');
 const {dispatch,syncCalls,sendPending,queueSummary}=await import('../server/integrations.ts');
 await saveSettings({phone:'+919999999999',callConsent:true,telegramConsent:true,chatId:'42',quietStart:'00:00',quietEnd:'00:00',dailyLimit:3});
 const original=globalThis.fetch;let telegramSends=0;let dispatchContext:any;let returnedId='';let sentText='';
 globalThis.fetch=async(input:any,init:any)=>{
 const url=String(input);
 if(url.endsWith('/calls/dispatch')){dispatchContext=JSON.parse(init.body);returnedId=dispatchContext.metadata.impactcall_id;return Response.json({success:true,requestId:77,status:'dispatched'});}
 if(url.includes('/calls/logs'))return Response.json({call_log_data:[{id:99,call_request_id:{id:77},metadata:{impactcall_id:returnedId},call_status:'completed',call_conversation:'LLM: Hello.<br/>User: Yes.<br/>LLM: The source forecasts renewable generation; results are not verified.<br/>User: Thanks.'}]});
 if(url.endsWith('/sendMessage')){telegramSends++;sentText=JSON.parse(init.body).text;return Response.json({ok:true,result:{message_id:55}});}
 throw new Error('Unexpected network request in test');
 };
 try{
 const call=await dispatch('tata-hybrid-2025',true);
 assert.equal(call.status,'dispatched');assert.equal(dispatchContext.call_context.company,'Tata Motors');assert.match(dispatchContext.call_context.source_url,/tatamotors.com/);
 assert.equal((await rows('SELECT * FROM calls'))[0].status,'dispatched');
 await syncCalls();await syncCalls();await queueSummary(call.id);await sendPending();
 const calls=await rows('SELECT * FROM calls');assert.equal(calls[0].status,'completed');assert.match(calls[0].transcript,/User: Yes/);assert.match(calls[0].summary,/forecasts renewable/);
 assert.equal(telegramSends,1);assert.match(sentText,/forecasts renewable/);assert.match(sentText,/Call status: completed/);
 assert.equal((await rows('SELECT * FROM messages'))[0].provider_message_id,'55');
 await assert.rejects(()=>dispatch('tata-hybrid-2025',true),/two minutes/);
 }finally{globalThis.fetch=original;await db.close();}
});
