const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = async () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../../components/events/sendAudiences.js'), 'utf8')).toString('base64'));

test('Unavailable reminder template blocks sending despite confirmed guests', async () => {
  const { computeSendAudiences, buildSendActionStates } = await load();
  const audiences = computeSendAudiences([{ id: 'confirmed', status: 'confirmed', invitation: { sent: true } }]);
  const unavailable = buildSendActionStates({ status: 'live', reminderAvailability: { configured: false } }, audiences);
  assert.equal(unavailable.extraReminder.enabled, false);
  assert.equal(unavailable.extraReminder.reasonKey, 'reminderUnavailable');
  const available = buildSendActionStates({ status: 'live', reminderAvailability: { configured: true } }, audiences);
  assert.equal(available.extraReminder.enabled, true);
});

test('Configured reminder still needs confirmed recipients', async () => {
  const { computeSendAudiences, buildSendActionStates } = await load();
  const states = buildSendActionStates({ status: 'live', reminderAvailability: { configured: true } }, computeSendAudiences([]));
  assert.equal(states.extraReminder.enabled, false);
  assert.equal(states.extraReminder.reasonKey, 'noConfirmed');
});
