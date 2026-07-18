const test = require('node:test');
const assert = require('node:assert/strict');

const { buildInvitationUrlButton } = require('../src/modules/messaging/messaging.formatting');
const { sanitizePayload } = require('../src/infrastructure/outboundMessageLog');

test('QR-only injects the guest code into a fixed invitation URL', () => {
  const component = buildInvitationUrlButton(
    { invitationType: 'qr_only' },
    { buttons: [{ type: 'URL', url: 'https://halaa.sa/ar/invitation/{{1}}', index: 0 }] },
    'guest-code'
  );
  assert.deepEqual(component, {
    type: 'button',
    sub_type: 'url',
    index: '0',
    parameters: [{ type: 'text', text: 'guest-code' }],
  });
});

test('QR-only injects a localized portal path when the template URL is domain-only', () => {
  const component = buildInvitationUrlButton(
    { invitationType: 'qr_only' },
    { buttons: [{ type: 'URL', url: 'https://halaa.sa/{{1}}', index: 0 }] },
    'guest-code',
    'en'
  );
  assert.equal(component.parameters[0].text, 'en/invitation/guest-code');
});

test('other invitation modes do not send a URL-button parameter', () => {
  assert.equal(
    buildInvitationUrlButton(
      { invitationType: 'reply_and_qr' },
      { buttons: [{ type: 'URL', url: 'https://halaa.sa/{{1}}', index: 0 }] },
      'guest-code'
    ),
    null
  );
});

test('outbound logging redacts the guest invitation code and SMS fallback', () => {
  const sanitized = sanitizePayload(
    {
      components: [
        {
          type: 'button',
          parameters: [{ type: 'text', text: 'secret-guest-code' }],
        },
      ],
      sms: { body: 'https://halaa.com.sa/ar/invitation/secret-guest-code' },
    },
    { sensitive: true }
  );
  assert.equal(sanitized.contentRedacted, true);
  assert.equal(sanitized.payload.components[0].parameters[0].text, '[REDACTED_SENSITIVE_CONTENT]');
  assert.equal(sanitized.payload.sms.body, '[REDACTED_SENSITIVE_CONTENT]');
});
