const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');

const config = require('../src/config');
const globalErrorHandler = require('../src/shared/errors/globalErrorHandler');
const { ValidationError } = require('../src/shared/errors/errorTypes');

const run = (err, { isDev, originalUrl = '/api/events' } = {}) => {
  const req = { requestId: 'test-request-id', originalUrl, method: 'POST' };
  const result = { warnings: [] };
  const res = {
    status(value) {
      result.statusCode = value;
      return this;
    },
    json(value) {
      result.payload = value;
      return this;
    },
  };
  const originalIsDev = config.isDev;
  const originalWarn = console.warn;
  config.isDev = isDev;
  console.warn = (...args) => result.warnings.push(args);
  try {
    globalErrorHandler(err, req, res, () => {});
  } finally {
    config.isDev = originalIsDev;
    console.warn = originalWarn;
  }
  return result;
};

for (const isDev of [true, false]) {
  const env = isDev ? 'development' : 'production';

  test(`${env}: operational validation errors keep structured errors and fieldErrors`, () => {
    const validationError = new ValidationError('Validation failed', [
      { field: 'guestList.0.phone', message: 'Invalid mobile number' },
    ]);
    const { statusCode, payload } = run(validationError, { isDev });

    assert.equal(statusCode, 400);
    assert.equal(payload.code, 'VALIDATION_ERROR');
    assert.deepEqual(payload.errors, validationError.errors);
    assert.equal(payload.fieldErrors['guestList.0.phone'], 'Invalid mobile number');
    assert.equal(payload.requestId, 'test-request-id');
  });

  test(`${env}: Mongoose validation errors become field-level validation errors`, () => {
    const mongooseError = new mongoose.Error.ValidationError();
    mongooseError.addError(
      'eventDetails.title',
      new mongoose.Error.ValidatorError({ path: 'eventDetails.title', message: 'Title is required' })
    );
    const { statusCode, payload } = run(mongooseError, { isDev });

    assert.equal(statusCode, 400);
    assert.equal(payload.code, 'VALIDATION_ERROR');
    assert.deepEqual(payload.errors, [{ field: 'eventDetails.title', message: 'Title is required' }]);
    assert.equal(payload.fieldErrors['eventDetails.title'], 'Title is required');
  });
}

test('validation log carries field names but no query string or token-like path segments', () => {
  const { warnings } = run(
    new ValidationError('Validation failed', [{ field: 'phone', message: 'Invalid mobile number' }]),
    {
      isDev: false,
      originalUrl: '/api/v2/guest-portal/AbCdEf0123456789xyz/rsvp?token=secret-token&phone=0501234567',
    }
  );

  assert.equal(warnings.length, 1);
  const [, details] = warnings[0];
  assert.equal(details.route, '/api/v2/guest-portal/:param/rsvp');
  assert.deepEqual(details.fields, ['phone']);
  const logged = JSON.stringify(warnings);
  assert.ok(!logged.includes('secret-token'));
  assert.ok(!logged.includes('0501234567'));
});
