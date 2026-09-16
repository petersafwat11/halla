const test = require('node:test');
const assert = require('node:assert/strict');
const { applyEventTestState } = require('../src/modules/events/eventTestState');

test('account and provider changes preserve successful test approval without a fingerprint', async () => {
  for (const fingerprint of [undefined, null, 'stale-legacy-hash']) {
    const event = { testMessageSent: true, testMessageFingerprint: fingerprint, host: { name: 'Renamed' }, subscriptionId: 'replacement', taqnyatTemplate: { templateRef: 'resynced' } };
    const result = await applyEventTestState(event);
    assert.equal(result.testMessageCurrent, true);
    assert.equal(result.testMessageSent, true);
  }
});
test('missing or explicitly reset test approval is not restored by a legacy hash', async () => {
  for (const sent of [false, undefined]) {
    const result = await applyEventTestState({ testMessageSent: sent, testMessageFingerprint: 'old-hash' });
    assert.equal(result.testMessageCurrent, false);
    assert.equal(result.testMessageSent, false);
  }
});
