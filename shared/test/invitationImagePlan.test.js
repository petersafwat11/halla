import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  boundInvitationDimensions,
  canSkipInvitationReencode,
  computeTemplateCaptureScale,
  createSingleFlight,
  tagTemplateBakeError,
  templateBakeErrorKey,
  TEMPLATE_BAKE_ERROR,
} from '../src/utils/invitationImagePlan.js';

describe('boundInvitationDimensions', () => {
  it('caps the long side at 2048 and never upscales', () => {
    assert.deepEqual(boundInvitationDimensions({ width: 1200, height: 2133 }), { width: 1152, height: 2048, scale: 2048 / 2133 });
    assert.deepEqual(boundInvitationDimensions({ width: 800, height: 1000 }), { width: 800, height: 1000, scale: 1 });
    assert.equal(boundInvitationDimensions({ width: 0, height: 100 }), null);
    assert.equal(boundInvitationDimensions({}), null);
  });
});

describe('computeTemplateCaptureScale', () => {
  it('renders a 420px preview at the bounded natural size', () => {
    const scale = computeTemplateCaptureScale({ renderedWidth: 420, renderedHeight: 746.5, naturalWidth: 1200, naturalHeight: 2133 });
    assert.equal(Math.round(746.5 * scale), 2048);
    assert.ok(Math.round(420 * scale) <= 2048);
  });

  it('bounds the fallback when the template has no natural size', () => {
    assert.equal(computeTemplateCaptureScale({ renderedWidth: 400, renderedHeight: 500 }), 2);
    assert.equal(computeTemplateCaptureScale({ renderedWidth: 1500, renderedHeight: 1500 }), 2048 / 1500);
  });

  it('refuses to capture an unmeasured preview', () => {
    assert.equal(computeTemplateCaptureScale({ renderedWidth: 0, renderedHeight: 500, naturalWidth: 1200, naturalHeight: 2133 }), null);
  });
});

describe('canSkipInvitationReencode', () => {
  it('skips only bounded JPEGs within the byte target', () => {
    assert.equal(canSkipInvitationReencode({ type: 'image/jpeg', width: 1152, height: 2048, bytes: 400_000 }), true);
    assert.equal(canSkipInvitationReencode({ type: 'image/png', width: 1152, height: 2048, bytes: 400_000 }), false);
    assert.equal(canSkipInvitationReencode({ type: 'image/jpeg', width: 1200, height: 2133, bytes: 400_000 }), false);
    assert.equal(canSkipInvitationReencode({ type: 'image/jpeg', width: 1152, height: 2048, bytes: 9 * 1024 * 1024 + 1 }), false);
    assert.equal(canSkipInvitationReencode({ type: 'image/jpeg', width: 1152, height: 2048 }), false);
  });
});

describe('template bake errors', () => {
  it('maps every failure class to an actionable message key', () => {
    assert.equal(templateBakeErrorKey(new Error('image-load-failed')), 'template_background_failed');
    assert.equal(templateBakeErrorKey('TEMPLATE_BACKGROUND_NOT_READY'), 'template_background_failed');
    assert.equal(templateBakeErrorKey(tagTemplateBakeError(new Error('boom'), TEMPLATE_BAKE_ERROR.CAPTURE)), 'template_capture_failed');
    assert.equal(templateBakeErrorKey(new Error('INVITATION_IMAGE_ENCODE_FAILED')), 'template_encode_failed');
    assert.equal(templateBakeErrorKey(Object.assign(new Error('x'), { code: 'EVENT_IMAGE_TOO_LARGE' })), 'template_image_too_large');
    assert.equal(templateBakeErrorKey(new Error('unexpected')), 'template_bake_failed');
  });

  it('keeps an existing code when tagging', () => {
    const error = Object.assign(new Error('x'), { code: 'EVENT_IMAGE_TOO_LARGE' });
    assert.equal(tagTemplateBakeError(error, TEMPLATE_BAKE_ERROR.CAPTURE).code, 'EVENT_IMAGE_TOO_LARGE');
  });
});

describe('createSingleFlight', () => {
  it('runs one task for repeated presses and frees itself after failure', async () => {
    const flight = createSingleFlight();
    let calls = 0;
    let release;
    const task = () => { calls += 1; return new Promise((resolve) => { release = resolve; }); };
    const first = flight.run(task);
    const second = flight.run(task);
    assert.equal(first, second);
    await Promise.resolve();
    assert.equal(flight.busy, true);
    release('done');
    assert.equal(await first, 'done');
    assert.equal(calls, 1);
    assert.equal(flight.busy, false);

    await assert.rejects(flight.run(() => { throw new Error('capture'); }), /capture/);
    assert.equal(flight.busy, false);
  });
});
