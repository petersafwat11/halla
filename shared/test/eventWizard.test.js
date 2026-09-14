import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidSaudiMobile } from '../src/utils/phone.js';
import { isObjectIdString, resolveReferenceId } from '../src/utils/referenceId.js';
import {
  hasEventCoordinates,
  normalizeCoordinate,
  normalizeEventCoordinates,
  normalizeEventLocation,
} from '../src/utils/eventLocation.js';
import {
  eventStepForServerCode,
  eventStepForServerField,
  findEventStepForServerError,
  findInvalidEventPeople,
  isValidEventPerson,
  resolveTaqnyatTemplateRef,
  resolveVisualTemplateRef,
} from '../src/utils/eventWizard.js';

describe('isValidSaudiMobile (mirrors backend saudiPhone)', () => {
  it('accepts every Saudi format the backend accepts', () => {
    for (const phone of ['0501234567', '501234567', '966501234567', '+966501234567', '+966 50 123-4567', '(050) 1234567', '٠٥٠١٢٣٤٥٦٧']) {
      assert.equal(isValidSaudiMobile(phone), true, phone);
    }
  });

  it('rejects Egyptian, landline, 00-prefixed, empty and non-string values', () => {
    for (const phone of ['+201001234567', '01001234567', '0112345678', '00966501234567', '', '   ', null, undefined, 501234567]) {
      assert.equal(isValidSaudiMobile(phone), false, String(phone));
    }
  });
});

describe('resolveReferenceId', () => {
  it('resolves strings, populated documents and ObjectId-like values', () => {
    assert.equal(resolveReferenceId('66cc33333333333333333333'), '66cc33333333333333333333');
    assert.equal(resolveReferenceId({ _id: '66cc33333333333333333333', templateName: 'x' }), '66cc33333333333333333333');
    assert.equal(resolveReferenceId({ id: '66cc33333333333333333333' }), '66cc33333333333333333333');
    assert.equal(resolveReferenceId({ _id: { toHexString: () => '66cc33333333333333333333' } }), '66cc33333333333333333333');
  });

  it('returns null for missing references', () => {
    for (const ref of [null, undefined, '', '  ', {}, { _id: null }, true]) {
      assert.equal(resolveReferenceId(ref), null);
    }
    assert.equal(isObjectIdString('[object Object]'), false);
  });

  it('resolves wizard template refs across form-data shapes', () => {
    const id = '66cc33333333333333333333';
    assert.equal(resolveTaqnyatTemplateRef({ taqnyatTemplate: { templateRef: { _id: id } } }), id);
    assert.equal(resolveTaqnyatTemplateRef({ taqnyatTemplateRef: id }), id);
    assert.equal(resolveTaqnyatTemplateRef({ taqnyatTemplate: { templateRef: null }, selectedTemplate: { _id: id } }), id);
    assert.equal(resolveTaqnyatTemplateRef({ taqnyatTemplate: { templateRef: null }, selectedTemplate: null }), null);
    assert.equal(resolveVisualTemplateRef({ templateRef: { _id: id } }), id);
    assert.equal(resolveVisualTemplateRef({ _id: id }), id);
    assert.equal(resolveVisualTemplateRef({ isCustomUpload: true }), null);
  });
});

describe('coordinate normalization', () => {
  it('never turns null, blank or whitespace into 0', () => {
    for (const value of [null, undefined, '', '   ', 'abc', true, {}, Number.NaN, Infinity]) {
      assert.equal(normalizeCoordinate(value, 90), null, String(value));
    }
  });

  it('keeps numeric strings, real zero and in-range values', () => {
    assert.equal(normalizeCoordinate(' 24.7136 ', 90), 24.7136);
    assert.equal(normalizeCoordinate(0, 90), 0);
    assert.equal(normalizeCoordinate('0', 180), 0);
    assert.equal(normalizeCoordinate(95, 90), null);
  });

  it('pairs coordinates so a half pin is dropped', () => {
    assert.deepEqual(normalizeEventCoordinates({ latitude: '24.7', longitude: ' ' }), { latitude: null, longitude: null });
    assert.deepEqual(normalizeEventCoordinates({ latitude: '24.7', longitude: '46.6' }), { latitude: 24.7, longitude: 46.6 });
    assert.equal(hasEventCoordinates({ latitude: ' ', longitude: ' ' }), false);
    assert.equal(normalizeEventLocation({ address: 'Riyadh', latitude: '', longitude: '' }).provider, 'manual');
  });
});

describe('event wizard people and server errors', () => {
  it('flags the exact invalid guest and staff rows', () => {
    const { guests, staff } = findInvalidEventPeople({
      guestList: [
        { name: 'Ok', mobile: '0501234567' },
        { name: 'Egypt', mobile: '+201001234567' },
        { name: ' ', phone: '0501234567' },
      ],
      staffList: [{ name: 'Staff', phone: '123' }],
    });
    assert.deepEqual(guests.map((row) => row.index), [1, 2]);
    assert.deepEqual(staff.map((row) => row.index), [0]);
    assert.equal(isValidEventPerson({ name: 'Both', mobile: '', phone: '0501234567' }), true);
  });

  it('maps backend field paths and codes to the earliest wizard step', () => {
    assert.equal(eventStepForServerField('eventDetails.location.latitude'), 1);
    assert.equal(eventStepForServerField('taqnyatTemplateRef'), 4);
    assert.equal(eventStepForServerField('guestListing'), null);
    assert.equal(eventStepForServerCode('BUSINESS_LOGO_REQUIRED'), 1);
    assert.equal(eventStepForServerCode('LIMIT_FILE_SIZE'), 3);
    assert.equal(
      findEventStepForServerError({
        response: { data: { errors: [{ field: 'guestReplies.onAttend' }, { field: 'guestList' }] } },
      }),
      2
    );
    assert.equal(findEventStepForServerError({ data: { code: 'EVENT_IMAGE_REQUIRED' } }), 3);
    assert.equal(findEventStepForServerError(null), null);
  });
});
