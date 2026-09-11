const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const memoryDb = require('./helpers/memoryDb');
const Event = require('../models/EventModel');
const Guest = require('../models/GuestModel');
const service = require('../src/modules/guests/guests.service');
const staff = require('../src/modules/staff/staff.service');

test.before(async () => { await memoryDb.start(); });
test.after(async () => { await memoryDb.stop(); });
test.beforeEach(async () => { await memoryDb.clearAll(); });

async function fixture(mode = 'reply_and_qr') {
  const eventId = new mongoose.Types.ObjectId();
  const guestId = new mongoose.Types.ObjectId();
  await Event.collection.insertOne({ _id: eventId, status: 'live', invitationDeliveryMode: 'portal_link', invitationType: mode, eventDetails: { title: 'Business gathering', date: new Date('2026-10-20'), time: '18:00' } });
  await Guest.collection.insertOne({ _id: guestId, event: eventId, qrcode: 'private-code', status: 'invited', deleted: false, __v: 0, rsvp: { message: 'Hello', dietaryRestrictions: 'No nuts', plusOnes: 2 } });
  return { eventId, guestId };
}

test('confirm, reload, decline, confirm again retain details and issue only authorized entry credentials', async t => {
  t.mock.method(service, '_notifyHostRSVP', async () => {});
  const { guestId, eventId } = await fixture();
  assert.equal((await service.getGuestByCode('private-code')).pass, null);
  const confirm = await service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 0 });
  assert.notEqual(confirm.pass.code, 'private-code');
  assert.equal(confirm.pass.guestsCount, 3);
  const reload = await service.getGuestByCode('private-code');
  assert.ok(reload.pass.code);
  assert.equal(reload.guest.rsvp.dietaryRestrictions, 'No nuts');
  assert.equal(reload.guest.revision, 1);
  await assert.rejects(() => service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 0 }), { code: 'RSVP_STATE_CHANGED' });
  await service.submitRSVP(guestId, 'declined', { invitationCode: 'private-code', revision: 1, message: '' });
  assert.equal((await service.getGuestByCode('private-code')).pass, null);
  await assert.rejects(() => staff.checkInByQR(eventId, confirm.pass.code, {}), /eligible entry pass/);
  await assert.rejects(() => staff.checkInByQR(eventId, 'private-code', {}), /Invalid entry pass/);
  const again = await service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 2 });
  assert.ok(again.pass.code); assert.equal(again.guest.rsvp.message, ''); assert.equal(again.guest.rsvp.plusOnes, 2);
});

test('reply-only, information-only, closed events and mismatched codes enforce backend policy', async t => {
  t.mock.method(service, '_notifyHostRSVP', async () => {});
  const { guestId, eventId } = await fixture('reply_only');
  const result = await service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 0 });
  assert.equal(result.pass, undefined); assert.equal((await service.getGuestByCode('private-code')).pass, null);
  await Event.updateOne({ _id: eventId }, { $set: { invitationType: 'none' } });
  await assert.rejects(() => service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 1 }), /no longer accepting/);
  await Event.updateOne({ _id: eventId }, { $set: { invitationType: 'reply_and_qr', status: 'cancelled' } });
  await assert.rejects(() => service.submitRSVP(guestId, 'declined', { invitationCode: 'private-code', revision: 1 }), /no longer accepting/);
  assert.equal((await service.getGuestByCode('private-code')).event.canRespond, false);
  await assert.rejects(() => service.submitRSVP(guestId, 'confirmed', { invitationCode: 'wrong', revision: 1 }), /Invalid invitation code/);
});

test('concurrent business responses have one atomic winner', async t => {
  t.mock.method(service, '_notifyHostRSVP', async () => {});
  const { guestId } = await fixture();
  const outcomes = await Promise.allSettled(['confirmed', 'declined'].map(response => service.submitRSVP(guestId, response, { invitationCode: 'private-code', revision: 0 })));
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal((await Guest.findById(guestId)).__v, 1);
});

test('legacy revisionless guests can respond and RSVP changes preserve check-in records', async t => {
  t.mock.method(service, '_notifyHostRSVP', async () => {});
  t.mock.method(staff, '_notifyHostCheckIn', async () => {});
  const { guestId, eventId } = await fixture();
  await Guest.collection.updateOne({ _id: guestId }, { $unset: { __v: '' } });
  const confirm = await service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 0 });
  assert.equal(confirm.guest.revision, 1);
  const scan = await staff.checkInByQR(eventId, confirm.pass.code, { _id: new mongoose.Types.ObjectId(), role: 'host' });
  assert.equal(scan.alreadyCheckedIn, false);
  const checked = await Guest.findById(guestId);
  assert.equal(checked.__v, 2);
  await assert.rejects(() => service.submitRSVP(guestId, 'declined', { invitationCode: 'private-code', revision: 1 }), { code: 'RSVP_STATE_CHANGED' });
  const update = await service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 2, message: 'Updated after arrival' });
  assert.equal(update.guest.status, 'checked_in');
  assert.equal((await staff.checkInByQR(eventId, update.pass.code, {})).alreadyCheckedIn, true);
  assert.equal((await Guest.findById(guestId)).checkIn.checkedInAt.getTime(), checked.checkIn.checkedInAt.getTime());
});

test('orphaned events cannot accept RSVP writes', async () => {
  const { guestId, eventId } = await fixture();
  await Event.deleteOne({ _id: eventId });
  await assert.rejects(() => service.submitRSVP(guestId, 'confirmed', { invitationCode: 'private-code', revision: 0 }), /no longer accepting/);
  assert.equal((await Guest.findById(guestId)).status, 'invited');
});

test('public HTTP routes validate payloads, protect private responses and reject stale or crafted writes', async t => {
  const express = require('express');
  t.mock.method(service, '_notifyHostRSVP', async () => {});
  const { guestId, eventId } = await fixture();
  const app = express();
  app.use(express.json());
  app.use('/guests', require('../src/modules/guests/guests.routes'));
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ code: error.code }));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const get = await fetch(`${origin}/guests/invitation/private-code?lang=en`);
    assert.equal(get.status, 200);
    assert.match(get.headers.get('cache-control'), /private, no-store/);
    assert.equal(get.headers.get('referrer-policy'), 'no-referrer');
    assert.equal((await get.json()).data.pass, null);
    const post = data => fetch(`${origin}/guests/${guestId}/rsvp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invitationCode: 'private-code', response: 'confirmed', revision: 0, ...data }) });
    assert.equal((await post({ plusOnes: 20 })).status, 400);
    const confirmed = await post({ plusOnes: 1 });
    assert.equal(confirmed.status, 200);
    assert.ok((await confirmed.json()).data.pass.code);
    assert.equal((await post({ plusOnes: 1 })).status, 409);
    assert.equal((await Guest.findById(guestId)).__v, 1);
    await Event.updateOne({ _id: eventId }, { $set: { invitationType: 'none' } });
    assert.equal((await post({ revision: 1 })).status, 403);
    assert.equal((await post({ invitationCode: 'forged', revision: 1 })).status, 403);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('test sends, initial sends, resends, reminders and SMS all use body links without buttons', async t => {
  const Template = require('../models/TaqnyatTemplateModel');
  const Subscription = require('../models/SubscriptionModel');
  const taqnyat = require('../src/infrastructure/taqnyat');
  const sender = require('../src/modules/messaging/messaging.send.service');
  const reminders = require('../src/modules/messaging/messaging.reminder.service');
  const resend = require('../src/modules/events/events.resend.service');
  t.mock.method(require('../src/modules/messaging/messaging.dispatchPolicy.service'), 'assertCanDispatch', async () => ({ allowed: true }));
  const sends = [];
  t.mock.method(taqnyat, 'sendWhatsAppTemplate', async (_phone, _name, language, components, sms) => {
    assert.equal(language, 'en');
    assert.ok(components.every(component => component.type !== 'button'));
    const link = components.find(component => component.type === 'body').parameters[0].text;
    assert.match(link, /\/en\/business-invitation\//);
    assert.ok(sms.body.includes(link)); sends.push(link);
    return { success: true, messageId: `test-message-${sends.length}` };
  });
  t.mock.method(taqnyat, 'sendSMS', async (_phone, body) => {
    assert.match(body, /\/business-invitation\//); sends.push(body); return { success: true, messageId: 'sms-test' };
  });
  for (const mode of ['reply_and_qr', 'reply_only', 'none']) {
    await memoryDb.clearAll();
    const { guestId, eventId } = await fixture(mode);
    const template = await Template.create({ taqnyatId: 'fixture', templateName: 'business_fixture', type: 'invite', language: 'en', category: 'conference', deliveryMode: 'portal_link', buttons: [], buttonsSynced: true, compatibleInvitationModes: ['reply_and_qr', 'reply_only', 'none'], bodyText: 'Invitation {{1}}', varMapping: [{ placeholder: '{{1}}', sourceKey: 'invitation.url' }] });
    const subscriptionId = new mongoose.Types.ObjectId();
    await Subscription.collection.insertOne({ _id: subscriptionId, invitePool: 100, compensationPool: 0, invitesConsumed: 0 });
    await Event.updateOne({ _id: eventId }, { $set: { status: 'pending_scheduling', 'eventDetails.type': 'conference', 'taqnyatTemplate.templateRef': template._id, subscriptionId, guestList: [guestId] } });
    await Guest.updateOne({ _id: guestId }, { $set: { phone: '966500000001', name: 'Fixture guest' } });
    const before = sends.length;
    await sender.sendTestMessage({ eventId, phoneNumber: '966500000001', isAdmin: true });
    const previewCode = sends.at(-1).split('/').at(-1);
    const preview = await service.getGuestByCode(previewCode);
    assert.equal(preview.preview, true); assert.equal(preview.event.canRespond, false); assert.equal(preview.pass, undefined);
    await Event.updateOne({ _id: eventId }, { $set: { status: 'live' } });
    await sender.sendToGuest({ eventId, guestId, channel: 'whatsapp', isAdmin: true });
    const result = await resend.resendInvite.call({ _buildScopedEventQuery: id => ({ _id: id }) }, eventId, { channel: 'whatsapp' });
    assert.equal(result.successful, 1);
    const event = await Event.findById(eventId);
    const guest = await Guest.findById(guestId);
    for (const reminderType of ['auto', 'extra']) {
      const batch = await reminders.sendAutoReminderBatch({ event, guests: [guest], reminderType, template: template.toObject(), attemptKey: `${mode}-${reminderType}` });
      assert.equal(batch.successful, 1);
    }
    await sender.sendToGuest({ eventId, guestId, channel: 'sms', isAdmin: true });
    await Template.create({ ...template.toObject(), _id: new mongoose.Types.ObjectId(), taqnyatId: 'reminder_fixture', templateName: 'business_reminder_fixture', type: 'reminder_confirmed' });
    if (mode === 'none') {
      await assert.rejects(reminders.sendReminder({ eventId, channel: 'whatsapp', isAdmin: true }), { code: 'RSVP_NOT_ALLOWED' });
      assert.equal(sends.length - before, 6);
    } else {
      const manual = await reminders.sendReminder({ eventId, channel: 'whatsapp', isAdmin: true });
      assert.equal(manual.successful, 1);
      assert.equal(sends.length - before, 7);
    }
  }
});
