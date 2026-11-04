import test from 'node:test';
import assert from 'node:assert/strict';

test('Telegram pairs only the private start code, delivers queued summary and avoids uncertain duplicate sends',async()=>{
 process.env.TEST_DB='memory://';process.env.TELEGRAM_BOT_TOKEN='test-token';process.env.TELEGRAM_BOT_USERNAME='test_bot';
 const {db,rows,saveSettings}=await import('../server/db.ts');
 const {registerChat,queueSummary,sendPending,telegramHealth}=await import('../server/integrations.ts');
 await saveSettings({telegramConsent:true,chatId:'',registrationCode:'private-code'});
 const original=globalThis.fetch;let validPairing=false,sends=0,mode='success';
 globalThis.fetch=async(input:any,init:any)=>{
 const url=String(input);
 if(url.endsWith('/getMe'))return Response.json({ok:true,result:{username:'test_bot'}});
 if(url.endsWith('/getUpdates'))return Response.json({ok:true,result:[
 {message:{chat:{id:1,type:'private'},text:'/start'}},
 {message:{chat:{id:2,type:'group'},text:'/start private-code'}},
 ...(validPairing?[{message:{chat:{id:3,type:'private'},text:'/start private-code'}}]:[])
 ]});
 if(url.endsWith('/sendMessage')){
 sends++;assert.equal(JSON.parse(init.body).chat_id,'3');
 if(mode==='reset')throw Object.assign(new Error('fetch failed'),{cause:{code:'ECONNRESET'}});
 if(mode==='rate_limit')return Response.json({ok:false,error_code:429,description:'Too Many Requests',parameters:{retry_after:60}});
 assert.match(JSON.parse(init.body).text,/tatamotors.com/);
 return Response.json({ok:true,result:{message_id:100+sends}});
 }
 throw new Error('Unexpected request');
 };
 const enqueue=async(id:string)=>{
 await db.query('INSERT INTO calls(id,event_id,status,summary) VALUES($1,$2,$3,$4)',[id,'tata-hybrid-2025','completed','Actual conversation summary']);await queueSummary(id);
 };
 try{
 await enqueue('call-1');await sendPending();
 assert.equal((await rows('SELECT data FROM settings'))[0].data.chatId,'');assert.equal(sends,0);
 validPairing=true;assert.equal((await registerChat()).chatId,'3');await sendPending();await sendPending();
 assert.equal(sends,1);assert.equal((await rows("SELECT status FROM messages WHERE call_id='call-1'"))[0].status,'sent');
 await enqueue('call-2');mode='rate_limit';await sendPending();await sendPending();
 const retry=(await rows("SELECT * FROM messages WHERE call_id='call-2'"))[0];assert.equal(retry.status,'retry');assert.equal(retry.attempts,1);assert.equal(sends,2);
 await enqueue('call-3');mode='reset';await sendPending();await sendPending();
 assert.equal((await rows("SELECT status FROM messages WHERE call_id='call-3'"))[0].status,'unknown');assert.equal(sends,3);assert.equal(telegramHealth.status,'unreachable');assert.doesNotMatch(telegramHealth.error!,/test-token/);
 }finally{globalThis.fetch=original;await db.close();}
});
