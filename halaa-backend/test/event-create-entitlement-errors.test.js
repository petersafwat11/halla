const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('event creation entitlement gates return stable client-facing codes', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/shared/middleware/subscription.js'),
    'utf8'
  );

  for (const code of [
    'SUBSCRIPTION_REQUIRED',
    'EVENT_LIMIT_REACHED',
    'INVITATION_CAPACITY_EXCEEDED',
  ]) {
    assert.ok(source.includes(`'${code}'`), `${code} must be returned by middleware`);
  }

  assert.doesNotMatch(
    source,
    /res\.status\(403\)\.json\(\{\s*success:\s*false,\s*message:\s*'No active subscription/
  );
});

