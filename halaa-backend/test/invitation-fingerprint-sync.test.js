const test = require('node:test');
const assert = require('node:assert/strict');
const {computeInvitationFingerprint: fingerprint, invitationFingerprintMatches: matches} = require('../src/modules/messaging/messaging.formatting');
const event = () => ({host:{name:'Test Host'},eventDetails:{title:'Conference',type:'conference',date:new Date('2026-10-20T00:00:00Z'),time:'20:00',location:{address:'Riyadh'}},invitationType:'reply_only',guestReplies:{onAttend:'أهلًا وسهلًا',onAbsent:'شكرًا لإبلاغنا'},taqnyatTemplate:{templateRef:'template-1'}});
const template = () => ({templateName:'conference_ar',language:'ar',updatedAt:new Date('2026-09-01'),bodyText:'Hello {{1}}',varMapping:[{placeholder:'1',sourceKey:'guest.name',fallback:''}],buttons:[],hasImageHeader:false});
test('template synchronization metadata does not invalidate a tested invitation',()=>{
 const e=event(),t=template();e.testMessageSent=true;e.testMessageFingerprint=fingerprint(e,t);
 assert.ok(e.testMessageFingerprint.startsWith('v2:'));
 assert.ok(matches(e,{...t,updatedAt:new Date('2026-09-10'),lastSyncedAt:new Date('2026-09-10')}));
});
test('actual template and invitation content changes still invalidate approval',()=>{
 const e=event(),t=template();e.testMessageSent=true;e.testMessageFingerprint=fingerprint(e,t);
 for(const change of [{bodyText:'Changed {{1}}'},{language:'en'},{templateName:'other'},{hasImageHeader:true},{buttons:[{type:'QUICK_REPLY',text:'Attend'}]}]) assert.equal(matches(e,{...t,...change}),false);
 assert.equal(matches({...e,eventDetails:{...e.eventDetails,title:'Changed'}},t),false);
 assert.equal(matches({...e,guestReplies:{...e.guestReplies,onAttend:'Changed'}},t),false);
});
test('legacy approval requires its exact full hash; missing or changed approvals are never restored',()=>{
 const e=event(),t=template();e.testMessageSent=true;e.testMessageFingerprint=fingerprint(e,t,{legacy:true});
 assert.ok(matches(e,t));
 assert.equal(matches(e,{...t,bodyText:'Changed'}),false);
 assert.equal(matches(e,{...t,updatedAt:new Date('2026-09-10')}),false);
 assert.equal(matches({...e,testMessageSent:false},t),false);
 assert.equal(matches({...e,testMessageFingerprint:null},t),false);
});

