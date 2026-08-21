const test = require('node:test');
const assert = require('node:assert/strict');
const { updateInvitationSettingsSchema } = require('../src/modules/events/events.validation');
const { parseFormDataJsonFields } = require('../src/shared/middleware/validation');

test('EVT-02: updateInvitationSettingsSchema accepts valid JSON object shapes', () => {
  const validPayload = {
    invitationType: 'reply_and_qr',
    taqnyatTemplate: {
      templateRef: '507f1f77bcf86cd799439011',
    },
    visualTemplate: {
      templateRef: '507f1f77bcf86cd799439012',
      fieldValues: { groomName: 'Ahmed' },
      isCustomUpload: false,
    },
    guestReplies: {
      onAttend: 'Welcome!',
      onAbsent: 'Sorry you cannot make it',
    },
  };

  const parsed = updateInvitationSettingsSchema.parse(validPayload);
  assert.equal(parsed.invitationType, 'reply_and_qr');
  assert.equal(parsed.taqnyatTemplate?.templateRef, '507f1f77bcf86cd799439011');
  assert.equal(parsed.visualTemplate?.templateRef, '507f1f77bcf86cd799439012');
  assert.equal(parsed.guestReplies?.onAttend, 'Welcome!');
});

test('EVT-02: updateInvitationSettingsSchema normalizes taqnyatTemplateRef boundary alias', () => {
  const payloadWithAlias = {
    taqnyatTemplateRef: '507f1f77bcf86cd799439011',
    guestReplies: {
      onAttend: 'Welcome!',
    },
  };

  const parsed = updateInvitationSettingsSchema.parse(payloadWithAlias);
  assert.deepEqual(parsed.taqnyatTemplate, {
    templateRef: '507f1f77bcf86cd799439011',
  });
});

test('EVT-02: updateInvitationSettingsSchema rejects non-object strings and arrays for object fields', () => {
  assert.throws(
    () => {
      updateInvitationSettingsSchema.parse({
        taqnyatTemplate: '507f1f77bcf86cd799439011', // raw string where object is required without alias
      });
    },
    /Expected object/i
  );

  assert.throws(
    () => {
      updateInvitationSettingsSchema.parse({
        visualTemplate: 'invalid-string',
      });
    },
    /Expected object/i
  );

  assert.throws(
    () => {
      updateInvitationSettingsSchema.parse({
        guestReplies: ['not', 'an', 'object'],
      });
    },
    /Expected object/i
  );
});

test('EVT-02: parseFormDataJsonFields parses taqnyatTemplate JSON string in multipart body', () => {
  const middleware = parseFormDataJsonFields([
    'selectedTemplate',
    'visualTemplate',
    'taqnyatTemplate',
    'fieldValues',
    'guestReplies',
  ]);

  const req = {
    body: {
      invitationType: 'reply_and_qr',
      taqnyatTemplate: JSON.stringify({ templateRef: '507f1f77bcf86cd799439011' }),
      visualTemplate: JSON.stringify({ isCustomUpload: true, fieldValues: {} }),
      guestReplies: JSON.stringify({ onAttend: 'Confirmed' }),
    },
  };

  let nextCalled = false;
  middleware(req, {}, (err) => {
    assert.ifError(err);
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.body.taqnyatTemplate, { templateRef: '507f1f77bcf86cd799439011' });
  assert.deepEqual(req.body.visualTemplate, { isCustomUpload: true, fieldValues: {} });
  assert.deepEqual(req.body.guestReplies, { onAttend: 'Confirmed' });
});

test('EVT-02: parseFormDataJsonFields returns 400 on malformed JSON string in multipart field', () => {
  const middleware = parseFormDataJsonFields(['taqnyatTemplate']);
  const req = {
    body: {
      taqnyatTemplate: '{ malformed json ',
    },
  };

  let errorCaptured = null;
  middleware(req, {}, (err) => {
    errorCaptured = err;
  });

  assert.ok(errorCaptured);
  assert.equal(errorCaptured.statusCode, 400);
  assert.match(errorCaptured.message, /Invalid JSON in field "taqnyatTemplate"/);
});
