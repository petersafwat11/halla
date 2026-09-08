/**
 * @halaa-checkin/api
 * Synthetic Fixture Builder.
 * Generates realistic test data for events, guests, and batches with varied
 * Arabic, English, and mixed-script names, companion counts, and references.
 */

import { EVENT_STATUSES, EVENT_TIMEZONE, normalizeForSearch, normalizeReferenceKey } from '@halaa-checkin/contracts';
import { Event } from '../../src/modules/events/event.model.js';
import { Guest } from '../../src/modules/guests/guest.model.js';
import { generateShortCode, generateQrToken } from '../../src/utils/crypto.js';

const SAMPLE_NAMES = [
  'أحمد بن محمد السعدون',
  'سارة عبدالله الفهد',
  'محمد إبراهيم القحطاني',
  'Dr. Sarah Al-Otaibi',
  'فاطمة الزهراء الشمري',
  'Alexander Michael Smith',
  'خالد بن وليد الدوسري',
  'Noor Al-Sabah & Family',
  'منى عبدالعزيز الراجحي',
  'Tariq H. Mansour',
  'ريم بنت فهد بن عبدالعزيز',
  'Omar & Layla Al-Ghamdi',
  'عبدالرحمن بن سعود التميمي',
  'Yousef Al-Khatib',
  'لطيفة بنت ناصر المطيري',
];

/**
 * Generate a synthetic event payload.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
export function buildSyntheticEventPayload(overrides = {}) {
  return {
    name: 'حفل افتتاح هيلتون الرياض - العرض التجريبي',
    venue: 'فندق هيلتون الرياض - قاعة الاحتفالات الكبرى',
    startsAt: '2026-09-15T19:00:00+03:00',
    timezone: EVENT_TIMEZONE,
    ...overrides,
  };
}

/**
 * Persist a synthetic event document to the database.
 *
 * @param {object} [overrides]
 * @returns {Promise<import('../../src/modules/events/event.model.js').Event>}
 */
export async function createTestEvent(overrides = {}) {
  const payload = buildSyntheticEventPayload(overrides);
  const event = new Event({
    name: payload.name,
    venue: payload.venue,
    startsAt: new Date(payload.startsAt),
    timezone: payload.timezone,
    status: overrides.status || EVENT_STATUSES.DRAFT,
    version: overrides.version || 1,
    activitySeq: overrides.activitySeq || 0,
    closedAt: overrides.closedAt || null,
  });
  await event.save();
  return event;
}

/**
 * Generate a synthetic guest payload.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
export function buildSyntheticGuestPayload(overrides = {}) {
  const name = overrides.name || SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
  const allowedCompanions =
    overrides.allowedCompanions !== undefined ? overrides.allowedCompanions : 2;

  return {
    name,
    reference: overrides.reference !== undefined ? overrides.reference : undefined,
    allowedCompanions,
    companionNames:
      overrides.companionNames !== undefined
        ? overrides.companionNames
        : allowedCompanions > 0
          ? ['ضيف مرافق 1', 'ضيف مرافق 2'].slice(0, allowedCompanions)
          : [],
    ...overrides,
  };
}

/**
 * Persist a synthetic guest document to the database.
 *
 * @param {string} eventId
 * @param {object} [overrides]
 * @returns {Promise<import('../../src/modules/guests/guest.model.js').Guest>}
 */
export async function createTestGuest(eventId, overrides = {}) {
  const payload = buildSyntheticGuestPayload(overrides);
  const qrToken = overrides.qrToken || generateQrToken();
  const shortCode = overrides.shortCode || generateShortCode();

  const guest = new Guest({
    eventId,
    name: payload.name,
    nameSearch: normalizeForSearch(payload.name),
    reference: payload.reference || undefined,
    referenceKey: payload.reference ? normalizeReferenceKey(payload.reference) : undefined,
    allowedCompanions: payload.allowedCompanions,
    companionNames: payload.companionNames || [],
    qrToken,
    shortCode,
    version: overrides.version || 1,
    checkIn: overrides.checkIn || null,
    deletedAt: overrides.deletedAt || null,
  });

  await guest.save();
  return guest;
}

/**
 * Generate a batch of synthetic guest documents in memory or persisted.
 *
 * @param {string} eventId
 * @param {number} count
 * @param {object} [options]
 * @param {boolean} [options.persist=false]
 * @returns {Promise<import('../../src/modules/guests/guest.model.js').Guest[]>}
 */
export async function buildSyntheticGuestBatch(eventId, count, { persist = false } = {}) {
  const guests = [];
  for (let i = 1; i <= count; i++) {
    const name = SAMPLE_NAMES[(i - 1) % SAMPLE_NAMES.length] + ` ${i}`;
    const allowed = i % 4; // 0, 1, 2, 3 companions
    const companions = [];
    for (let c = 1; c <= allowed; c++) {
      companions.push(`مرافق ${c} لـ ${name}`);
    }

    const guestData = {
      eventId,
      name,
      nameSearch: normalizeForSearch(name),
      reference: `BATCH-INV-${String(i).padStart(4, '0')}`,
      referenceKey: `BATCH-INV-${String(i).padStart(4, '0')}`,
      allowedCompanions: allowed,
      companionNames: companions,
      qrToken: generateQrToken(),
      shortCode: generateShortCode(),
      version: 1,
      checkIn: null,
      deletedAt: null,
    };

    if (persist) {
      const guest = new Guest(guestData);
      await guest.save();
      guests.push(guest);
    } else {
      guests.push(guestData);
    }
  }
  return guests;
}
