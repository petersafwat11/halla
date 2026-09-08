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
const { runAutoReminderForEvent } = require('../src/shared/utils/scheduledTasks');

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

test('category-neutral reminders require approval and mapping; category-specific and portal templates stay isolated', async () => {
  const Template = require('../models/TaqnyatTemplateModel');
  const general = await Template.create({ taqnyatId: 'general', templateName: 'general', category: 'general_event', type: 'reminder_confirmed', status: 'PENDING' });
  assert.equal(await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed'), null);
  general.status = 'APPROVED'; await general.save();
  assert.equal(String((await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed'))._id), String(general._id));
  assert.equal(await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed', 'portal_link'), null);
  const specific = await Template.create({ taqnyatId: 'specific', templateName: 'specific', category: 'engagement', type: 'reminder_confirmed' });
  assert.equal(String((await templates.findActiveByCategoryAndType('engagement', 'reminder_confirmed'))._id), String(specific._id));
  const { getEventBodyParams } = require('../src/modules/messaging/messaging.formatting');
  const params = getEventBodyParams({ eventDetails: { date: '2026-09-13T21:00:00Z', time: '12:00:PM' } }, 'Guest',
    { language: 'en', varMapping: [{ placeholder: '{{1}}', sourceKey: 'eventDetails.timeFormatted' }] });
  assert.equal(params[0], '12:00 PM');
});
