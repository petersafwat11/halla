const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { s3Storage } = require('../src/shared/utils/s3Upload');
const { uploadEventImages } = require('../src/modules/events/eventImages');

function app() {
  const server = express();
  server.post('/', uploadEventImages, (req, res) => res.json({
    file: req.file?.fieldname || null,
    fields: Object.keys(req.files || {}),
    title: req.body.title,
  }));
  server.use((err, req, res, next) => res.status(400).json({ code: err.code }));
  return server;
}

async function send(t, images = []) {
  const server = app().listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  const body = new FormData();
  body.set('title', 'Event');
  for (const name of images) body.append(name, new Blob(['image'], { type: 'image/png' }), 'image.png');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`, { method: 'POST', body });
  return { status: response.status, body: await response.json() };
}

test('legacy cover is discarded; only the invitation reaches the existing storage adapter', async t => {
  const stored = [];
  t.mock.method(s3Storage, '_handleFile', (req, file, cb) => {
    stored.push(file.fieldname);
    file.stream.resume();
    file.stream.on('end', () => cb(null, { key: 'invitation.png' }));
  });
  const response = await send(t, ['coverImage', 'templateImage']);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { file: 'templateImage', fields: ['templateImage'], title: 'Event' });
  assert.deepEqual(stored, ['templateImage']);
});

test('creation without files remains supported', async t => {
  const response = await send(t);
  assert.equal(response.status, 200);
  assert.equal(response.body.file, null);
});

test('unrecognized upload fields remain rejected', async t => {
  const response = await send(t, ['otherImage']);
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'LIMIT_UNEXPECTED_FILE');
});
