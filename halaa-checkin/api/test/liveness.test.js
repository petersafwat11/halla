import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('API liveness endpoint returns 200 and healthy status', async (t) => {
  const app = createApp({
    config: {
      env: 'test',
      appOrigin: 'http://localhost:3100',
    },
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  // Test /api/checkin/v1/health
  const res = await fetch(`${baseUrl}/api/checkin/v1/health`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/json/);

  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'checkin-api');
  assert.ok(typeof data.timestamp === 'string');
  assert.ok(typeof data.uptimeSeconds === 'number');

  // Test root /health
  const rootRes = await fetch(`${baseUrl}/health`);
  assert.equal(rootRes.status, 200);
  const rootData = await rootRes.json();
  assert.equal(rootData.status, 'ok');

  // Test 404 for unknown route
  const notFoundRes = await fetch(`${baseUrl}/api/checkin/v1/unknown-endpoint`);
  assert.equal(notFoundRes.status, 404);
  const notFoundData = await notFoundRes.json();
  assert.equal(notFoundData.error.code, 'NOT_FOUND');
});
