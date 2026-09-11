const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveInvitationDelivery, buildGuestInvitationUrl, isBusinessTemplate, assertBusinessTemplate } = require('../src/modules/messaging/invitationDelivery');
const { isTemplateCompatibleWithInvitationMode } = require('../src/modules/taqnyat-templates/taqnyat-template-capabilities');
const { buildSmsBody, getEventBodyParams } = require('../src/modules/messaging/messaging.formatting');
const { guestEventActions } = require('../src/modules/guests/guestEventActions');

const modes = ['reply_and_qr', 'reply_only', 'none'];
const template = { deliveryMode: 'portal_link', buttonsSynced: true, buttons: [], active: true, status: 'APPROVED', compatibleInvitationModes: modes, bodyText: 'Invitation: {{1}}', varMapping: [{ placeholder: '{{1}}', sourceKey: 'invitation.url' }] };

test('business template supports all website modes, with zero buttons and a real body mapping', () => {
  for (const mode of modes) {
    assert.equal(isTemplateCompatibleWithInvitationMode(template, mode, 'portal_link'), true);
    assert.equal(isTemplateCompatibleWithInvitationMode(template, mode, 'quick_reply'), false);
  }
  for (const bad of [ { ...template, buttons: [{ type: 'URL' }] }, { ...template, buttons: [{ type: 'QUICK_REPLY' }] }, { ...template, buttonsSynced: false }, { ...template, varMapping: [] }, { ...template, bodyText: 'No placeholder' }, { ...template, varMapping: [...template.varMapping, ...template.varMapping] } ]) {
    assert.equal(isBusinessTemplate(bad), false);
    assert.throws(() => assertBusinessTemplate(bad), { code: 'BUSINESS_LINK_TEMPLATE_REQUIRED' });
  }
  assert.throws(() => assertBusinessTemplate({ ...template, status: 'PENDING' }));
});

test('delivery snapshots win over account changes; every business SMS mode contains its link', () => {
  assert.equal(resolveInvitationDelivery({ invitationDeliveryMode: 'quick_reply', host: { accountType: 'business' } }), 'quick_reply');
  for (const mode of modes) {
    const event = { invitationType: mode, invitationDeliveryMode: 'portal_link', eventDetails: { title: 'Conference' } };
    const url = buildGuestInvitationUrl(event, 'a/b?', 'en');
    assert.ok(url.endsWith('/en/business-invitation/a%2Fb%3F'));
    assert.ok(buildSmsBody(event, 'Guest', url).includes(url));
    assert.deepEqual(getEventBodyParams(event, 'Guest', template, { invitation: { url } }), [url]);
  }
  assert.ok(buildGuestInvitationUrl({ invitationDeliveryMode: 'quick_reply' }, 'abc').endsWith('/ar/invitation/abc'));
  assert.ok(!buildSmsBody({ invitationType: 'none' }, 'Guest', 'https://example.com').includes('https://example.com'));
});

test('calendar uses Riyadh time, escapes injection, and exposes no guest credentials', () => {
  for (const time of ['18:30', '6:30 PM', '٦:٣٠ م', '06:30:PM', '٦:٣٠:م']) {
    const event = { _id: 'event1', eventDetails: { title: 'مؤتمر, Business\nBEGIN:BAD', date: '2026-10-20', time, location: { address: 'Venue', latitude: 24.7, longitude: 46.6 } } };
    const actions = guestEventActions(event);
    assert.equal(actions.startAt, '2026-10-20T15:30:00.000Z');
    assert.ok(actions.calendarIcs.includes('DTSTART:20261020T153000Z'));
    assert.ok(!actions.calendarIcs.includes('\r\nBEGIN:BAD'));
    assert.ok(!actions.calendarIcs.includes('DTEND'));
    assert.equal(new URL(actions.directionsUrl).searchParams.get('destination'), '24.7,46.6');
    assert.equal(new URL(actions.ride.url).searchParams.get('dropoff[latitude]'), '24.7');
    for (const line of actions.calendarIcs.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  }
  assert.equal(guestEventActions({ eventDetails: { location: { latitude: null, longitude: null } } }).ride, undefined);
});

test('guest page and sender select the final Step 3 design, with legacy invitation fallback', () => {
  const { eventInvitationImage } = require('@halaa/shared/utils/eventInvitationImage.cjs');
  assert.equal(eventInvitationImage({ visualTemplate: { bakedImagePath: 'final.png' }, templateImage: 'old.png', branding: { coverImageKey: 'cover.png' } }), 'final.png');
  assert.equal(eventInvitationImage({ templateImage: 'legacy.png' }), 'legacy.png');
  assert.equal(eventInvitationImage({ branding: { coverImageKey: 'cover.png' } }), null);
});
