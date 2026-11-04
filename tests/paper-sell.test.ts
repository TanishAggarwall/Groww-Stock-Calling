import test from 'node:test';
import assert from 'node:assert/strict';

test('Demo voice sell requires user intent plus a prompted PIN; closes exactly once and rejects stale holdings',async()=>{
 process.env.TEST_DB='memory://';process.env.DEMO_SELL_PIN='1357';
 const {db,rows}=await import('../server/db.ts');
 const {saleAuthorization,processPaperSale,redactDemoPin}=await import('../server/paper-sell.ts');
 const conversation=(answer:string)=>`User: Please sell the holding.\nLLM: Please tell me your four-digit demo PIN.\nUser: ${answer}`;
 assert.equal(saleAuthorization(conversation('one three five seven'),'1357').authorized,true);
 assert.equal(saleAuthorization(conversation('१ ३ ५ ७'),'1357').authorized,true);
 assert.equal(saleAuthorization(conversation('एक तीन पाँच सात'),'1357').authorized,true);
 assert.equal(saleAuthorization(conversation('9999'),'1357').authorized,false);
 const separate='LLM: Would you like to sell your demo holding?\nUser: Yeah.\nLLM: Please tell me your demo PIN.\nUser: 1\nLLM: Continue with the next digits.\nUser: 3\nLLM: Continue.\nUser: 5\nLLM: Last digit please.\nUser: 7\nLLM: PIN verified.';
 assert.equal(saleAuthorization(separate,'1357').authorized,true);
 assert.equal(saleAuthorization('LLM: Would you like to sell your demo holding?\nUser: No.\nLLM: PIN?\nUser: 1357','1357').authorized,false);
 assert.equal((redactDemoPin(separate,'1357').match(/PIN entry redacted/g)||[]).length,4);
 assert.equal(saleAuthorization('LLM: Sell and use PIN 1357.\nUser: Thank you.','1357').authorized,false);
 assert.equal(saleAuthorization('User: Sell 1357 shares.','1357').authorized,false);
 assert.equal(saleAuthorization(conversation('1357')+'\nUser: Cancel, do not sell.','1357').authorized,false);
 assert.doesNotMatch(redactDemoPin(conversation('one three five seven'),'1357'),/one three five seven/);
 const event={id:'paper-test',companyId:'tata-motors',simulated:true,kind:'paper_price',paper:{cycle:1,scenarioPrice:90}};
 try{
 await db.query('INSERT INTO events(id,company_id,data) VALUES($1,$2,$3)',[event.id,event.companyId,JSON.stringify(event)]);
 for(const id of ['wrong','right','stale'])await db.query('INSERT INTO calls(id,event_id,status) VALUES($1,$2,$3)',[id,event.id,'completed']);
 await db.query('INSERT INTO paper_positions(company_id,quantity,average_price,simulated_price,cycle) VALUES($1,10,100,90,1)',[event.companyId]);
 assert.equal((await processPaperSale('wrong',event,conversation('9999')))?.status,'not_authorized');
 assert.equal((await rows('SELECT * FROM paper_positions')).length,1);
 assert.equal((await processPaperSale('right',event,conversation('1357')))?.status,'executed');
 assert.equal((await rows('SELECT * FROM paper_positions')).length,0);
 assert.equal((await processPaperSale('right',event,conversation('1357')))?.status,'executed');
 assert.equal((await rows('SELECT * FROM paper_sales')).length,1);
 assert.equal((await rows('SELECT realized_pnl FROM paper_sales'))[0].realized_pnl,-100);
 await db.query('INSERT INTO paper_positions(company_id,quantity,average_price,simulated_price,cycle) VALUES($1,20,110,115,2)',[event.companyId]);
 assert.equal((await processPaperSale('stale',event,conversation('1357')))?.status,'position_changed');
 assert.equal((await rows('SELECT quantity FROM paper_positions'))[0].quantity,20);
 }finally{await db.close();}
});
