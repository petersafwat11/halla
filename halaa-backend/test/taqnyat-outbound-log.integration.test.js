const test = require('node:test');
const assert = require('node:assert/strict');

const memoryDb = require('./helpers/memoryDb');
const OutboundMessage = require('../models/OutboundMessageModel');
const taqnyat = require('../src/infrastructure/taqnyat');
const {
  updateOutboundDeliveryStatus,
  markOutboundSmsFallback,
} = require('../src/infrastructure/outboundMessageLog');

let originalSmsAdapter;
let originalWaAdapter;

test.before(async () => {
  await memoryDb.start();
  originalSmsAdapter = taqnyat.__test.smsClient.defaults.adapter;
  originalWaAdapter = taqnyat.__test.waClient.defaults.adapter;
  taqnyat.TAQNYAT_CONFIG.apiKey = 'integration-test-key';
});

test.after(async () => {
  taqnyat.__test.smsClient.defaults.adapter = originalSmsAdapter;
  taqnyat.__test.waClient.defaults.adapter = originalWaAdapter;
  await memoryDb.stop();
});

test.beforeEach(async () => {
  await memoryDb.clearAll();
});

function response(config, data) {
  return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });
}

test('persists successful SMS provider id, content, response, and context', async () => {
  taqnyat.__test.smsClient.defaults.adapter = (config) => response(config, {
    statusCode: 201,
    messageId: 'sms-provider-1',
    cost: 0.12,
    currency: 'SAR',
    accepted: 1,
  });

  const result = await taqnyat.sendSMS('0500115125', 'staff portal link', {
    sender: 'HalaaApp',
    logContext: { purpose: 'staff_access', metadata: { staffName: 'Salem' } },
  });

  assert.equal(result.success, true);
  assert.equal(result.messageId, 'sms-provider-1');
  assert.ok(result.outboundMessageId);

  const row = await OutboundMessage.findById(result.outboundMessageId).lean();
  assert.equal(row.providerMessageId, 'sms-provider-1');
  assert.equal(row.channel, 'sms');
  assert.equal(row.messageType, 'sms');
  assert.equal(row.status, 'sent');
  assert.equal(row.requestPayload.body, 'staff portal link');
  assert.equal(row.purpose, 'staff_access');
  assert.equal(row.context.staffName, 'Salem');
  assert.equal(row.cost, 0.12);
});

test('persists WhatsApp template request and message id', async () => {
  taqnyat.__test.waClient.defaults.adapter = (config) => response(config, {
    type: 'whatsapp',
    statuses: [{ message_id: 'wamid.template-1', recipient: '966500115125' }],
  });

  const result = await taqnyat.sendWhatsAppTemplate(
    '0500115125',
    'staff_access_v1',
    'ar',
    [{ type: 'body', parameters: [{ type: 'text', text: 'Salem' }] }],
    null,
    { logContext: { purpose: 'staff_access' } }
  );

  assert.equal(result.messageId, 'wamid.template-1');
  const row = await OutboundMessage.findOne({ providerMessageId: result.messageId }).lean();
  assert.equal(row.templateName, 'staff_access_v1');
  assert.equal(row.templateLanguage, 'ar');
  assert.equal(row.requestPayload.components[0].parameters[0].text, 'Salem');
});

test('redacts OTP content while retaining verification metadata', async () => {
  taqnyat.__test.smsClient.defaults.adapter = (config) => response(config, {
    statusCode: 201,
    messageId: 'sms-otp-1',
  });

  await taqnyat.sendSMS('0500115125', 'Your verification code is 123456', {
    sensitive: true,
    logContext: { purpose: 'auth_otp' },
  });

  const row = await OutboundMessage.findOne({ providerMessageId: 'sms-otp-1' }).lean();
  assert.equal(row.requestPayload.body, '[REDACTED_SENSITIVE_CONTENT]');
  assert.equal(row.contentRedacted, true);
  assert.equal(row.contentLength, 'Your verification code is 123456'.length);
  assert.equal(row.contentHash.length, 64);
});

test('persists provider soft failures with response details', async () => {
  taqnyat.__test.waClient.defaults.adapter = (config) => response(config, {
    message: '402',
    reason: 'Invalid recipient',
  });

  const result = await taqnyat.sendWhatsAppText('0500115125', 'hello');
  assert.equal(result.success, false);

  const row = await OutboundMessage.findOne({ channel: 'whatsapp' }).lean();
  assert.equal(row.status, 'failed');
  assert.equal(row.providerMessageId, null);
  assert.equal(row.error.code, '402');
  assert.equal(row.providerResponse.message, '402');
});

test('persists bulk SMS recipients and provider accounting data', async () => {
  taqnyat.__test.smsClient.defaults.adapter = (config) => response(config, {
    statusCode: 201,
    messageId: 'sms-bulk-1',
    cost: 0.24,
    currency: 'SAR',
    accepted: 2,
  });

  await taqnyat.sendBulkSMS(['0500115125', '0500115223'], 'event update');
  const row = await OutboundMessage.findOne({ providerMessageId: 'sms-bulk-1' }).lean();
  assert.equal(row.messageType, 'bulk_sms');
  assert.equal(row.recipientCount, 2);
  assert.equal(row.recipients.length, 2);
  assert.equal(row.providerResponse.accepted, 2);
});

test('persists image sends and follows delivery/fallback webhooks', async () => {
  taqnyat.__test.waClient.defaults.adapter = (config) => response(config, {
    type: 'image',
    statuses: { message_id: 'wamid.image-1', recipient: '966500115125' },
  });

  await taqnyat.sendWhatsAppImage(
    '0500115125',
    'https://example.test/qr.png',
    'Your QR pass',
    { logContext: { purpose: 'rsvp_qr_reply' } }
  );

  await updateOutboundDeliveryStatus('wamid.image-1', 'delivered', new Date('2026-07-18T12:00:00Z'));
  await markOutboundSmsFallback('wamid.image-1', new Date('2026-07-18T12:01:00Z'));

  const row = await OutboundMessage.findOne({ providerMessageId: 'wamid.image-1' }).lean();
  assert.equal(row.messageType, 'image');
  assert.equal(row.requestPayload.image.caption, 'Your QR pass');
  assert.equal(row.effectiveChannel, 'sms');
  assert.equal(row.status, 'sent');
  assert.deepEqual(row.deliveryHistory.map((entry) => entry.status), [
    'sent',
    'delivered',
    'sms_fallback',
  ]);
});
