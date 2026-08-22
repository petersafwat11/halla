import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUpdateEventStep,
  buildUpdateEventUrl,
  EVENT_UPDATE_SECTION_TO_STEP,
} from '@halaa/shared/utils';

describe('Session 1.5 Web: Event Routes & Messaging Tests (EVT-11, EVT-12, ADM-09)', () => {
  it('parses update event steps and section aliases consistently', () => {
    // Number and string steps
    assert.equal(parseUpdateEventStep({ step: '1' }), 1);
    assert.equal(parseUpdateEventStep({ step: 2 }), 2);
    assert.equal(parseUpdateEventStep({ step: '3' }), 3);
    assert.equal(parseUpdateEventStep({ step: 4 }), 4);

    // Section alias mapping
    assert.equal(parseUpdateEventStep({ section: 'event-details' }), 1);
    assert.equal(parseUpdateEventStep({ section: 'guest-list' }), 2);
    assert.equal(parseUpdateEventStep({ section: 'invitation-settings' }), 4);
    assert.equal(parseUpdateEventStep({ section: 'invitation-customization' }), 4);

    // URLSearchParams object
    const params = new URLSearchParams('id=evt_123&section=guest-list');
    assert.equal(parseUpdateEventStep(params), 2);

    // Default fallback
    assert.equal(parseUpdateEventStep({}), 1);
    assert.equal(parseUpdateEventStep(null), 1);
  });

  it('builds update event URLs with canonical step parameter', () => {
    const url1 = buildUpdateEventUrl({
      locale: 'ar',
      basePath: 'host',
      eventId: 'evt_999',
      step: 2,
    });
    assert.equal(url1, '/ar/host/update-event?id=evt_999&step=2');

    const url2 = buildUpdateEventUrl({
      locale: 'en',
      basePath: 'admin-dash',
      eventId: 'evt_999',
      section: 'invitation-settings',
    });
    assert.equal(url2, '/en/admin-dash/update-event?id=evt_999&step=4');
  });
});
