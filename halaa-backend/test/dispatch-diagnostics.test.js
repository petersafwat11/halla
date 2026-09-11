const test = require('node:test');
const assert = require('node:assert/strict');
const { runBatched } = require('../src/shared/utils/runBatched');
test('batch failures retain bounded stage, code and stack without contact details', async () => {
  const error = new Error('Cannot send to +966500115122 user@example.com https://example.com/private?token=secret');
  error.code = 'INVITE_CAPACITY'; error.dispatchStage = 'invite_capacity'; error.statusCode = 402;
  const result = await runBatched(['guest'], async () => { throw error; });
  const diagnostic = result.results[0].diagnostic;
  assert.equal(diagnostic.code, 'INVITE_CAPACITY');
  assert.equal(diagnostic.stage, 'invite_capacity');
  assert.equal(diagnostic.statusCode, 402);
  assert.ok(diagnostic.frames.length > 0);
  assert.doesNotMatch(JSON.stringify(diagnostic), /966500115122|user@example|token=secret/);
});
