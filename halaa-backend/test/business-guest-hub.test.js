const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { resolveInvitationDelivery, buildGuestInvitationUrl, isBusinessTemplate, assertBusinessTemplate } = require('../src/modules/messaging/invitationDelivery');
const { isTemplateCompatibleWithInvitationMode } = require('../src/modules/taqnyat-templates/taqnyat-template-capabilities');
const { buildSmsBody, getEventBodyParams } = require('../src/modules/messaging/messaging.formatting');
const { guestEventActions } = require('../src/modules/guests/guestEventActions');
const { optimizeCover } = require('../src/modules/events/eventCover');

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
  for (const time of ['18:30', '6:30 PM', '٦:٣٠ م']) {
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

test('cover optimization enforces decoded format/dimensions and strips metadata', async () => {
  const buffer = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#234567' } }).jpeg().withMetadata().toBuffer();
  const result = await optimizeCover({ buffer, mimetype: 'image/jpeg' });
  const meta = await sharp(result).metadata();
  assert.equal(meta.format, 'webp'); assert.equal(meta.width, 1600); assert.equal(meta.height, 900); assert.equal(meta.exif, undefined);
  await assert.rejects(() => optimizeCover({ buffer: Buffer.from('not an image') }), { code: 'INVALID_BUSINESS_COVER' });
  await assert.rejects(() => optimizeCover(null), { code: 'BUSINESS_COVER_REQUIRED' });
  const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: 'white' } }).png().toBuffer();
  await assert.rejects(() => optimizeCover({ buffer: small, mimetype: 'image/png' }), { code: 'INVALID_BUSINESS_COVER' });
  await assert.rejects(() => optimizeCover({ buffer, mimetype: 'image/png' }), { code: 'INVALID_BUSINESS_COVER' });
});
