const test = require('node:test');
const assert = require('node:assert/strict');
const defaults = require('@halaa/shared/constants/guestReplies.cjs');
const { getReplyMessage, buildConfirmedCaption } = require('../src/shared/utils/rsvpMessages');
test('guest defaults stay Arabic across UI languages and blank overrides', () => {
  for (const lang of ['ar', 'en', 'fr']) {
    assert.equal(getReplyMessage('confirmed', {}, lang), defaults.onAttend);
    assert.equal(getReplyMessage('declined', { guestReplies: { onAbsent: '  ' } }, lang), defaults.onAbsent);
    assert.ok(buildConfirmedCaption({}, {}, lang).startsWith(defaults.onAttend));
  }
});
test('custom replies remain authoritative in any language', () => {
  assert.equal(getReplyMessage('confirmed', { guestReplies: { onAttend: '  Welcome!  ' } }, 'ar'), 'Welcome!');
  assert.equal(getReplyMessage('declined', { guestReplies: { onAbsent: 'Custom apology' } }, 'en'), 'Custom apology');
  assert.equal(getReplyMessage('unknown', {}, 'en'), '');
});
