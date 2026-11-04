export function inQuietHours(start:string,end:string,now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 if(start===end)return false;
 return start<end ? parts>=start&&parts<end : parts>=start||parts<end;
}
export function normalizeStatus(s:string){
 if(['completed','busy','failed','no-answer','cancelled','canceled','voicemail_detected'].includes(s))return s;
 return null;
}
export function callPolicy(s:any,event:any,demo:boolean,now=new Date()) {
 if(!s.callConsent)return 'Enable call consent in Settings first.';
 if(!/^\+[1-9]\d{7,14}$/.test(s.phone||''))return 'Register a valid mobile number with country code.';
 if(event.simulated){if(!demo||event.kind!=='paper_price')return 'Simulated price scenarios require an explicitly requested demo call.';}
 else if(!event.verified)return 'Only source-verified events can be used for a call.';
 if(!demo&&event.severity!=='High')return 'Automatic phone calls require a high-priority event.';
 if(inQuietHours(s.quietStart,s.quietEnd,now))return 'Quiet hours are active (India time).';
 return null;
}
