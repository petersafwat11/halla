const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const memoryDb = require('./helpers/memoryDb');
const Guest = require('../models/GuestModel');
const Event = require('../models/EventModel');
const taqnyat = require('../src/infrastructure/taqnyat');
const notifications = require('../src/modules/notifications/notifications.service');
const { handleButtonResponse } = require('../src/modules/messaging/messaging.webhook.service');
const { buildReplyPreview } = require('@halaa/shared/utils/rsvpMessages');
const form = { eventName:'Reply contract fixture',eventDate:'2026-10-20',eventTime:'18:30',address:{address:'Riyadh hall'},guestReplies:{onAttend:'Welcome!',onAbsent:'Thank you for letting us know'} };

test.before(async()=>memoryDb.start());
test.after(async()=>memoryDb.stop());
test.beforeEach(async()=>memoryDb.clearAll());

async function fixture(mode, deliveryMode='quick_reply') {
 const eventId=new mongoose.Types.ObjectId();
 await Event.collection.insertOne({_id:eventId,host:new mongoose.Types.ObjectId(),status:'live',invitationType:mode,invitationDeliveryMode:deliveryMode,guestReplies:form.guestReplies,eventDetails:{title:form.eventName,date:new Date(form.eventDate),time:form.eventTime,location:form.address}});
 return Guest.create({event:eventId,name:'Test Guest',phone:'+966500000001',qrcode:'test-only-entry-code',status:'invited'});
}

for(const mode of ['reply_and_qr','reply_only','none']) for(const response of ['confirmed','declined']) {
 test(`${mode} / ${response}: actual mocked transport matches the shared preview`, async t=>{
  const calls=[];
  t.mock.method(notifications,'sendToUser',async()=>{});
  for(const method of ['sendWhatsAppImage','sendWhatsAppText','sendSMS']) t.mock.method(taqnyat,method,async(...args)=>{calls.push({method,args});return {success:true};});
  const guest=await fixture(mode);
  await handleButtonResponse({phoneNumber:guest.phone,buttonText:response,messageId:'test-response'});
  const preview=buildReplyPreview({...form,invitationType:mode,response});
  if(mode==='none') { assert.equal(calls.length,0);return; }
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,preview.includesQr?'sendWhatsAppImage':'sendWhatsAppText');
  assert.equal(calls[0].args[preview.includesQr?2:1],preview.text);
  if(preview.includesQr) assert.match(calls[0].args[1],/text=test-only-entry-code/);
 });
}

test('QR delivery failure falls back to SMS with caption plus image link',async t=>{
 t.mock.method(notifications,'sendToUser',async()=>{});
 t.mock.method(taqnyat,'sendWhatsAppImage',async()=>({success:false,error:'test-only failure'}));
 const sms=[];t.mock.method(taqnyat,'sendSMS',async(...args)=>{sms.push(args);return {success:true};});
 const guest=await fixture('reply_and_qr');
 await handleButtonResponse({phoneNumber:guest.phone,buttonText:'confirmed',messageId:'test-response'});
 assert.equal(sms.length,1);
 assert.ok(sms[0][1].startsWith(buildReplyPreview({...form,invitationType:'reply_and_qr',response:'confirmed'}).text));
 assert.match(sms[0][1],/رمز الدخول الخاص بك: https:\/\/quickchart.io\/qr/);
});

test('business WhatsApp button responses send nothing; RSVP belongs on the website',async t=>{
 const calls=[];
 for(const method of ['sendWhatsAppImage','sendWhatsAppText','sendSMS']) t.mock.method(taqnyat,method,async()=>{calls.push(method);return {success:true};});
 const guest=await fixture('reply_and_qr','portal_link');
 const result=await handleButtonResponse({phoneNumber:guest.phone,buttonText:'confirmed',messageId:'test-response'});
 assert.equal(result.reason,'website_rsvp_only');
 assert.deepEqual(calls,[]);
});

test('business portal keeps the host reply separate from the guest note on submit and reload',async t=>{
 const service=require('../src/modules/guests/guests.service');
 t.mock.method(service,'_notifyHostRSVP',async()=>{});
 const guest=await fixture('reply_and_qr','portal_link');
 const result=await service.submitRSVP(guest._id,'confirmed',{invitationCode:guest.qrcode,revision:0,message:'A note from the guest',lang:'en'});
 assert.equal(result.message,form.guestReplies.onAttend);
 const refreshed=await service.getGuestByCode(guest.qrcode,'en');
 assert.equal(refreshed.message,form.guestReplies.onAttend);
 assert.equal(refreshed.guest.rsvp.message,'A note from the guest');
 assert.ok(refreshed.pass.code);
});
