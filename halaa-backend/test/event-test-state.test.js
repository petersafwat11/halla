const test = require('node:test');
const assert = require('node:assert/strict');
const Template = require('../models/TaqnyatTemplateModel');
const { computeInvitationFingerprint } = require('../src/modules/messaging/messaging.formatting');
const { applyEventTestState } = require('../src/modules/events/eventTestState');

test('account rename invalidates the read-side test gate without changing stored approval', async t => {
  const template = { templateName: 'demo', language: 'ar', bodyText: 'Hello', hasImageHeader: false };
  t.mock.method(Template, 'findById', () => ({ lean: async () => template }));
  const stored = { status: 'scheduled', host: { name: 'Original', accountType: 'business' }, invitationDeliveryMode: 'portal_link', taqnyatTemplate: { templateRef: 'template' }, visualTemplate: { templateRef: 'design' }, testMessageSent: true };
  stored.testMessageFingerprint = computeInvitationFingerprint(stored, template);
  const current = await applyEventTestState({ ...stored });
  assert.equal(current.testMessageCurrent, true);
  const changed = await applyEventTestState({ ...stored, host: { ...stored.host, name: 'Renamed' } });
  assert.equal(changed.testMessageCurrent, false);
  assert.equal(changed.testMessageSent, false);
  assert.equal(stored.testMessageSent, true);
  const populated = await applyEventTestState({ ...stored, taqnyatTemplate: { templateRef: { _id: 'template' } }, visualTemplate: { templateRef: { _id: 'design' } } });
  assert.equal(populated.testMessageCurrent, true);
});
