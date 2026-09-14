const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('deployment API npm commands exist in the shipped backend package', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/deploy.yml'), 'utf8');
  const { scripts } = require('../package.json');
  for (const command of workflow.matchAll(/docker compose (?:exec|run)[^\n]*\bapi npm run ([\w:-]+)/g)) {
    assert.ok(Object.hasOwn(scripts, command[1]), `Deployment invokes missing backend script: ${command[1]}`);
  }
});
