const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const db = require('./helpers/memoryDb');
require('../models/UserModel');
const Event = require('../models/EventModel');
const Guest = require('../models/GuestModel');
const policy = require('../src/modules/messaging/messaging.dispatchPolicy.service');
const templates = require('../src/modules/taqnyat-templates/taqnyat-templates.service');
const reminders = require('../src/modules/messaging/messaging.reminder.service');
const provider = require('../src/infrastructure/taqnyat');
const { runAutoReminderForEvent, closeUnsentReminder } = require('../src/shared/utils/scheduledTasks');

test.before(() => db.start());
test.after(() => db.stop());
test.beforeEach(() => db.clearAll());

async function fixture() {
  const event = await Event.create({ host: new mongoose.Types.ObjectId(), status: 'live',
    eventDetails: { title: 'Reminder retry', type: 'wedding', date: new Date(Date.now() + 5 * 86400000), time: '20:00',
      location: { address: 'Riyadh', latitude: 24.7, longitude: 46.6 } } });
  const guests = await Guest.create(['confirmed', 'confirmed', 'declined', 'pending', 'confirmed'].map((response, i) => ({
    event: event._id, name: `Guest ${i}`, phone: `96650000000${i}`, qrcode: `reminder-guest-${i}`, invitation: { sent: true },
    rsvp: { response: response === 'pending' ? undefined : response },
  })));
  event.guestList = guests.slice(0, 4).map(g => g._id);
  await event.save();
  return { event, guests };
}

test('missing template and partial failures stay retryable; only current confirmed guests receive reminders', async t => {
  t.mock.method(policy, 'assertCanDispatch', async () => ({ allowed: true }));
  const lookup = t.mock.method(templates, 'findActiveByCategoryAndType', async () => null);
  const { event, guests } = await fixture();
  assert.equal((await runAutoReminderForEvent(event)).failed, 2);
  assert.notEqual((await Event.findById(event._id)).messagingStatus.reminderSent, true);
  lookup.mock.mockImplementation(async () => ({ templateName: 'reminder' }));
  let attempts = 0;
  t.mock.method(reminders, 'sendAutoReminderBatch', async ({ guests: audience }) => {
    attempts++;
    assert.deepEqual(audience.map(g => String(g._id)), (attempts === 1 ? guests.slice(0, 2) : [guests[1]]).map(g => String(g._id)));
    return { successful: 1, failed: 0, rateLimited: attempts === 1 ? 1 : 0,
      details: audience.map((g, i) => ({ guestId: g._id, success: i === 0, messageId: 'accepted' })) };
  });
  assert.equal((await runAutoReminderForEvent(event)).failed, 1);
  assert.notEqual((await Event.findById(event._id)).messagingStatus.reminderSent, true);
  assert.equal((await runAutoReminderForEvent(event)).reminded, true);
  assert.equal((await runAutoReminderForEvent(event)).reason, 'already_completed_or_missing');
  assert.equal(attempts, 2);
});

test('provider rejection can retry the same idempotency key; accepted reminder is replayed without another send', async t => {
  const { event, guests } = await fixture();
  const send = t.mock.method(provider, 'sendWhatsAppTemplate', async () => ({ success: false, statusCode: 429, error: 'RATE_LIMITED' }));
  const args = { event, guests: [guests[0]], reminderType: 'reminder_confirmed', template: { templateName: 'reminder', language: 'ar', body: 'Reminder' } };
  const first = await reminders.sendAutoReminderBatch(args);
  assert.equal(first.rateLimited, 1, JSON.stringify(first));
  send.mock.mockImplementation(async () => ({ success: true, messageId: 'accepted' }));
  assert.equal((await reminders.sendAutoReminderBatch(args)).successful, 1);
  assert.equal((await reminders.sendAutoReminderBatch(args)).successful, 1);
  assert.equal(send.mock.callCount(), 2);
});

test('global reminders require approval and isolate account types regardless of event category', async () => {
  const Template = require('../models/TaqnyatTemplateModel');
  const general = await Template.create({ taqnyatId: 'general', templateName: 'general', category: null, type: 'reminder_confirmed', status: 'PENDING' });
  assert.equal(await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed'), null);
  general.status = 'APPROVED'; await general.save();
  assert.equal(String((await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed'))._id), String(general._id));
  assert.equal(await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed', 'portal_link'), null);
  const specific = await Template.create({ taqnyatId: 'specific', templateName: 'specific', category: 'engagement', type: 'reminder_confirmed' });
  assert.equal(String((await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed'))._id), String(general._id));
  assert.equal((await templates.listForHost({ type: 'reminder_confirmed', category: 'birthday' })).length, 1);
  const { assignMappingSchema } = require('../src/modules/taqnyat-templates/taqnyat-templates.validation');
  assert.equal(assignMappingSchema.safeParse({ type: 'reminder_confirmed', deliveryMode: 'quick_reply', category: null }).success, true);
  await templates.assignMapping(specific._id, { type: 'reminder_confirmed', category: 'engagement', active: true });
  assert.equal((await Template.findById(specific._id)).category, null);
  assert.equal((await Template.findById(general._id)).active, false);
  assert.equal(String((await templates.findActiveByCategoryAndType('birthday', 'reminder_confirmed'))._id), String(specific._id));
  const business = await Template.create({ taqnyatId: 'business', templateName: 'business', type: 'reminder_confirmed', deliveryMode: 'portal_link', category: null, status: 'APPROVED', buttonsSynced: true, buttons: [], bodyText: 'Invitation {{1}}', varMapping: [{ placeholder: '{{1}}', sourceKey: 'invitation.url' }] });
  await templates.assignMapping(business._id, { type: 'reminder_confirmed', active: true });
  for (const category of ['wedding', 'conference', 'graduation', 'meeting', 'other']) {
    assert.equal(String((await templates.findActiveByCategoryAndType(category, 'reminder_confirmed'))._id), String(specific._id));
    assert.equal(String((await templates.findActiveByCategoryAndType(category, 'reminder_confirmed', 'portal_link'))._id), String(business._id));
  }
  assert.equal((await Template.findById(specific._id)).active, true);
  const { getEventBodyParams } = require('../src/modules/messaging/messaging.formatting');
  const params = getEventBodyParams({ eventDetails: { date: '2026-09-13T21:00:00Z', time: '12:00:PM' } }, 'Guest',
    { language: 'en', varMapping: [{ placeholder: '{{1}}', sourceKey: 'eventDetails.timeFormatted' }] });
  assert.equal(params[0], '12:00 PM');
});

test('paid extra reminder records and charges only acceptance without suppressing free automatic reminder', async t => {
  const Subscription = require('../models/SubscriptionModel');
  const Plan = require('../models/PlanModel');
  const service = require('../src/modules/events/events.resend.service');
  const { event, guests } = await fixture();
  const plan = await Plan.getOrCreateByCode('basic_monthly_50');
  const sub = await Subscription.create({ userId: event.host, planId: plan._id, status: 'active', invitePool: 50, invitesConsumed: 0, expiresAt: new Date(Date.now()+30*86400000) });
  event.subscriptionId = sub._id; await event.save();
  t.mock.method(policy, 'assertCanDispatch', async () => ({ allowed: true }));
  t.mock.method(templates, 'findActiveByCategoryAndType', async () => ({ templateName: 'reminder', language: 'ar' }));
  t.mock.method(reminders, 'sendAutoReminderBatch', async ({guests: audience}) => {
    assert.equal(audience.length, 2);
    return { successful: 1, failed: 0, rateLimited: 1, details: [{guestId: guests[0]._id, success:true, messageId:'extra-accepted'}, {guestId:guests[1]._id,success:false}] };
  });
  const result = await service.extraReminder.call({ _buildScopedEventQuery: id => ({_id:id}) }, event._id, {guestIds: guests.slice(0,4).map(g=>g._id)}, {_id:event.host,role:'admin'});
  assert.equal(result.successful,1); assert.equal(result.failed,1);
  const accepted=await Guest.findById(guests[0]._id);
  assert.equal(accepted.invitation.extraReminderCount,1);
  assert.equal(accepted.invitation.extraReminderMessageId,'extra-accepted');
  assert.equal(accepted.invitation.autoReminderSent,false);
  assert.equal((await Guest.findById(guests[1]._id)).invitation.extraReminderCount,0);
  assert.equal((await Subscription.findById(sub._id)).invitesConsumed,1);
});

test('reminder settings persist across owner/admin contexts and reject unrelated users, terminal states and invalid windows', async () => {
 const service = require('../src/modules/events/events.service');
 const {event}=await fixture();
 const admin={_id:new mongoose.Types.ObjectId(),role:'admin'};
 const owner={_id:event.host,role:'host'};
 const day=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
 for(const actor of [owner,admin]) {
  await service.updateReminderSettings(event._id,{customReminderTime:true,scheduledDate:day,scheduledTime:'15:30'},actor);
  assert.equal((await Event.findById(event._id)).reminderSettings.scheduledTime,'15:30');
  await service.updateReminderSettings(event._id,{customReminderTime:true,scheduledDate:day,scheduledTime:'16:30'},actor);
  assert.equal((await Event.findById(event._id)).reminderSettings.scheduledTime,'16:30');
  await service.updateReminderSettings(event._id,{customReminderTime:false,scheduledDate:null,scheduledTime:null},actor);
  const reset=await Event.findById(event._id);
  assert.equal(reset.reminderSettings.customReminderTime,false);
  assert.ok(reset.reminderSettings.scheduledDate);
 }
 await assert.rejects(service.updateReminderSettings(event._id,{customReminderTime:false},{_id:new mongoose.Types.ObjectId(),role:'host'}));
 await assert.rejects(service.updateReminderSettings(event._id,{customReminderTime:true,scheduledDate:'2020-01-01',scheduledTime:'12:00'},owner));
 for(const status of ['cancelled','completed']){
  await Event.updateOne({_id:event._id},{$set:{status}});
  await assert.rejects(service.updateReminderSettings(event._id,{customReminderTime:false},admin));
 }
});

test('concurrent extra reminders cannot spend the same last credit', async t => {
 const Subscription=require('../models/SubscriptionModel'); const Plan=require('../models/PlanModel');
 const service=require('../src/modules/events/events.resend.service');
 const {event,guests}=await fixture();
 const plan=await Plan.getOrCreateByCode('basic_monthly_50');
 const sub=await Subscription.create({userId:event.host,planId:plan._id,status:'active',invitePool:1,compensationPool:0,invitesConsumed:0,expiresAt:new Date(Date.now()+86400000)});
 event.subscriptionId=sub._id;await event.save();
 t.mock.method(policy,'assertCanDispatch',async()=>({allowed:true}));
 t.mock.method(templates,'findActiveByCategoryAndType',async()=>({templateName:'reminder'}));
 let sends=0;
 t.mock.method(reminders,'sendAutoReminderBatch',async({guests:audience})=>{sends++;return {successful:1,failed:0,rateLimited:0,details:[{guestId:audience[0]._id,success:true,messageId:'accepted'}]};});
 const results=await Promise.allSettled([0,1].map(i=>service.extraReminder.call({_buildScopedEventQuery:id=>({_id:id})},event._id,{guestIds:[guests[i]._id]},{_id:event.host,role:'host'})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(sends,1);assert.equal((await Subscription.findById(sub._id)).invitesConsumed,1);
});

test('an empty confirmed audience leaves the reminder pending instead of completing it', async t => {
  t.mock.method(policy, 'assertCanDispatch', async () => ({ allowed: true }));
  t.mock.method(templates, 'findActiveByCategoryAndType', async () => ({ templateName: 'reminder' }));
  const send = t.mock.method(reminders, 'sendAutoReminderBatch', async () => {
    throw new Error('must not dispatch without an eligible audience');
  });
  const { event, guests } = await fixture();
  // Nobody has confirmed yet — invitations are out, replies have not arrived.
  await Guest.updateMany({ _id: { $in: guests.map(g => g._id) } }, { $unset: { 'rsvp.response': '' } });
  const result = await runAutoReminderForEvent(event);
  assert.equal(result.reason, 'no_eligible_recipients');
  assert.equal(result.reminded, false);
  assert.equal(send.mock.callCount(), 0);
  assert.notEqual((await Event.findById(event._id)).messagingStatus.reminderSent, true);
});

test('a reminder that fires before the invitations launch stays pending', async t => {
  t.mock.method(policy, 'assertCanDispatch', async () => ({ allowed: true }));
  t.mock.method(templates, 'findActiveByCategoryAndType', async () => ({ templateName: 'reminder' }));
  const send = t.mock.method(reminders, 'sendAutoReminderBatch', async () => {
    throw new Error('must not dispatch before launch');
  });
  const { event } = await fixture();
  // Confirmed guests exist, but the event has not launched yet.
  await Event.updateOne(
    { _id: event._id },
    { $set: { status: 'scheduled' }, $unset: { launchedAt: '' } }
  );
  const result = await runAutoReminderForEvent(event);
  assert.equal(result.reason, 'invitations_not_launched');
  assert.equal(send.mock.callCount(), 0);
  assert.notEqual((await Event.findById(event._id)).messagingStatus.reminderSent, true);

  // Once launched, the same event is dispatchable again — the flag never stuck.
  await Event.updateOne({ _id: event._id }, { $set: { status: 'live', launchedAt: new Date() } });
  send.mock.mockImplementation(async ({ guests: audience }) => ({
    successful: audience.length, failed: 0, rateLimited: 0,
    details: audience.map(g => ({ guestId: g._id, success: true, messageId: 'accepted' })),
  }));
  assert.equal((await runAutoReminderForEvent(event)).reminded, true);
  assert.equal((await Event.findById(event._id)).messagingStatus.reminderSent, true);
});

test('rescheduling the reminder re-arms a completed one; an unchanged schedule does not', async () => {
  const service = require('../src/modules/events/events.service');
  const { event } = await fixture();
  const owner = { _id: event.host, role: 'host' };
  const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const markSent = () => Event.updateOne(
    { _id: event._id },
    { $set: { 'messagingStatus.reminderSent': true, 'messagingStatus.reminderSentAt': new Date() } }
  );

  await markSent();
  await service.updateReminderSettings(event._id, { customReminderTime: true, scheduledDate: day, scheduledTime: '15:30' }, owner);
  const rescheduled = await Event.findById(event._id);
  assert.equal(rescheduled.messagingStatus.reminderSent, false);
  assert.ok(!rescheduled.messagingStatus.reminderSentAt);

  // Re-applying the SAME instant is not a reschedule — completion must stand.
  await markSent();
  await service.updateReminderSettings(event._id, { customReminderTime: true, scheduledDate: day, scheduledTime: '15:30' }, owner);
  assert.equal((await Event.findById(event._id)).messagingStatus.reminderSent, true);

  // Dropping back to the automatic 48h default is also a reschedule.
  await service.updateReminderSettings(event._id, { customReminderTime: false, scheduledDate: null, scheduledTime: null }, owner);
  assert.equal((await Event.findById(event._id)).messagingStatus.reminderSent, false);
});

test('a batch that delivers nothing leaves the reminder pending even with no reported failures', async t => {
  t.mock.method(policy, 'assertCanDispatch', async () => ({ allowed: true }));
  t.mock.method(templates, 'findActiveByCategoryAndType', async () => ({ templateName: 'reminder' }));
  t.mock.method(reminders, 'sendAutoReminderBatch', async () => (
    { successful: 0, failed: 0, rateLimited: 0, details: [] }
  ));
  const { event } = await fixture();
  const result = await runAutoReminderForEvent(event);
  assert.equal(result.reminded, false);
  assert.notEqual((await Event.findById(event._id)).messagingStatus.reminderSent, true);
});

test('a reminder whose window closes unsent is closed out, not left pending forever', async () => {
  const { event } = await fixture();

  await closeUnsentReminder(event, 'no_eligible_recipients');

  const closed = await Event.findById(event._id);
  // It must NOT claim to have been sent — nothing went out.
  assert.notEqual(closed.messagingStatus.reminderSent, true);
  // But it must be terminal, with the reason on the record, so the cron stops
  // re-examining it and the outcome is explicable.
  assert.ok(closed.messagingStatus.reminderClosedAt instanceof Date);
  assert.equal(closed.messagingStatus.reminderSkipReason, 'no_eligible_recipients');

  // Closing twice must not move the timestamp.
  const firstClosedAt = closed.messagingStatus.reminderClosedAt.getTime();
  await closeUnsentReminder(event, 'window_expired');
  const again = await Event.findById(event._id);
  assert.equal(again.messagingStatus.reminderClosedAt.getTime(), firstClosedAt);
  assert.equal(again.messagingStatus.reminderSkipReason, 'no_eligible_recipients');
});

test('a reminder that already sent is never closed out', async () => {
  const { event } = await fixture();
  await Event.updateOne(
    { _id: event._id },
    { $set: { 'messagingStatus.reminderSent': true, 'messagingStatus.reminderSentAt': new Date() } }
  );

  await closeUnsentReminder(event, 'window_expired');

  const after = await Event.findById(event._id);
  assert.equal(after.messagingStatus.reminderSent, true);
  assert.ok(!after.messagingStatus.reminderClosedAt);
});

test('rescheduling re-arms a reminder that was closed unsent', async () => {
  const service = require('../src/modules/events/events.service');
  const { event } = await fixture();
  const owner = { _id: event.host, role: 'host' };
  const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  await closeUnsentReminder(event, 'invitations_not_launched');
  assert.ok((await Event.findById(event._id)).messagingStatus.reminderClosedAt);

  await service.updateReminderSettings(
    event._id,
    { customReminderTime: true, scheduledDate: day, scheduledTime: '15:30' },
    owner
  );

  const rearmed = await Event.findById(event._id);
  assert.ok(!rearmed.messagingStatus.reminderClosedAt);
  assert.ok(!rearmed.messagingStatus.reminderSkipReason);
  assert.notEqual(rearmed.messagingStatus.reminderSent, true);
});

test('a legacy event with no scheduled reminder instant never closes and never crashes the tick', async t => {
  // Legacy events are selected by the 48h date window and carry no
  // reminderSettings.scheduledDate, so parseReminderTime() returns null.
  // Computing a grace window from that used to throw and abort the whole tick.
  t.mock.method(policy, 'assertCanDispatch', async () => ({ allowed: true }));
  const { event } = await fixture();
  await Event.updateOne({ _id: event._id }, { $unset: { reminderSettings: 1 } });

  const { parseReminderTime } = require('../src/shared/utils/timezone');
  const legacy = await Event.findById(event._id);
  assert.equal(parseReminderTime(legacy), null, 'precondition: no parseable instant');

  const tick = require('../src/shared/utils/scheduledTasks');
  // The close-out helper must be a no-op decision for legacy events: exercise
  // the reminder directly and confirm nothing was closed behind our back.
  await tick.runAutoReminderForEvent(legacy);
  const after = await Event.findById(event._id);
  assert.ok(!after.messagingStatus.reminderClosedAt, 'legacy reminder must not be closed');
});
