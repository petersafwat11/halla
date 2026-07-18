/**
 * Messaging formatting helpers.
 * Pure / DB-only utilities shared by the send / reminder / schedule splits.
 */

const TaqnyatTemplate = require('../../../models/TaqnyatTemplateModel');
const { formatRiyadh } = require('../../shared/utils/timezone');
const logger = require('../../shared/utils/logger');
const { INVITATION_TYPE } = require('../../shared/constants');

const TAQNYAT_SENDER = process.env.TAQNYAT_SENDER_NAME || 'HalaaApp';

/**
 * Format a date for messages in Asia/Riyadh wall-clock.
 * Falls back to '' when no date is supplied.
 */
function formatDate(date, lang = 'ar') {
  if (!date) return '';
  return formatRiyadh(date, {
    style: 'date',
    locale: lang === 'ar' ? 'ar-SA' : 'en-US',
  });
}

/**
 * Resolve the cached TaqnyatTemplate for an event from
 * `event.taqnyatTemplate.templateRef`. Returns `null` when no template
 * is selected (caller falls back to the 5-param shape).
 */
async function resolveTaqnyatTemplate(event) {
  try {
    const ref = event.taqnyatTemplate?.templateRef;
    if (!ref) return null;
    const doc = await TaqnyatTemplate.findById(ref).lean();
    if (doc) return doc;
  } catch (err) {
    logger.warn('[messaging] resolveTaqnyatTemplate failed', { error: err.message });
  }
  return null;
}

/**
 * Build body params for Taqnyat template variables.
 *
 * Reads the per-template `varMapping[]` curated by admins on the
 * TaqnyatTemplate cache. Each mapping entry maps `{{N}}` to a dotted
 * `sourceKey` resolved against an event/guest/host context.
 *
 * Legacy fallback (5 params): guest_name, event_name, event_date,
 * event_time, event_location. The 5-param shape prevents Taqnyat code
 * 100 ("Invalid or missing parameter") on undercount when the template
 * expects five.
 */
function getEventBodyParams(event, guestName, taqnyatTemplate = null, extraContext = {}) {
  const fallback = () => [
    guestName || 'ضيفنا الكريم',
    event.eventDetails?.title || 'مناسبة',
    formatDate(event.eventDetails?.date),
    event.eventDetails?.time || '',
    event.eventDetails?.location?.address || 'يُحدد لاحقاً',
  ];

  if (
    !taqnyatTemplate ||
    !Array.isArray(taqnyatTemplate.varMapping) ||
    taqnyatTemplate.varMapping.length === 0
  ) {
    return fallback();
  }

  // Mongoose subdocs lose their data on `...` spread (fields live behind a
  // proxy, not as own enumerable properties). Unwrap with `.toObject()` so
  // varMapping resolution sees real values, not undefined.
  const ed = event.eventDetails?.toObject?.() || event.eventDetails || {};
  const loc = ed.location?.toObject?.() || ed.location || {};
  const mapUrl =
    loc.latitude != null && loc.longitude != null
      ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
      : '';
  const ctx = {
    guest: { name: guestName || 'ضيفنا الكريم' },
    eventDetails: {
      ...ed,
      dateFormatted: formatDate(ed.date),
      location: { ...loc, mapUrl },
    },
    host:
      event.host && typeof event.host === 'object'
        ? { name: event.host.name || event.host.username || '' }
        : {},
    // Caller-supplied branches (e.g. staff.*) merge last so they win.
    ...extraContext,
  };

  const ordered = [...taqnyatTemplate.varMapping].sort((a, b) => {
    const ai = parseInt(String(a.placeholder).replace(/\D/g, ''), 10) || 0;
    const bi = parseInt(String(b.placeholder).replace(/\D/g, ''), 10) || 0;
    return ai - bi;
  });

  return ordered.map((m) => {
    const value = m.sourceKey
      .split('.')
      .reduce((acc, k) => (acc == null ? acc : acc[k]), ctx);
    const resolved =
      value === undefined || value === null || value === '' ? m.fallback : value;
    return resolved == null ? '' : String(resolved);
  });
}

/**
 * Build SMS fallback body text from event data.
 */
function buildSmsBody(event, guestName, rsvpLink) {
  const title = event.eventDetails?.title || 'مناسبة';
  const date = formatDate(event.eventDetails?.date);
  const time = event.eventDetails?.time || '';
  const location = event.eventDetails?.location?.address || '';
  const name = guestName ? `${guestName}، ` : '';
  return `${name}أنت مدعو لحضور ${title}\nبتاريخ ${date} الساعة ${time}\n${location}\n${rsvpLink}`;
}

/**
 * Returns the image URL for a template header, or null when:
 *   - the selected template has no IMAGE header component, OR
 *   - no canonical / legacy image path is set, OR
 *   - the stored path is non-http (local file Taqnyat cannot reach).
 *
 * Sending a header component for a template that has none triggers
 * Taqnyat error code 100 ("Invalid or missing parameter").
 */
function getEventImageUrl(event, taqnyatTemplate = null) {
  const hasImageHeader = taqnyatTemplate?.hasImageHeader === true;
  if (!hasImageHeader) return null;

  const imagePath =
    event.visualTemplate?.bakedImagePath || event.templateImage;
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return null;
}

/** Build the provider parameter for a QR-only template's dynamic URL CTA. */
function buildInvitationUrlButton(event, taqnyatTemplate, invitationCode, lang = 'ar') {
  if (event?.invitationType !== INVITATION_TYPE.QR_ONLY) return null;
  const button = (taqnyatTemplate?.buttons || []).find(
    (candidate) => String(candidate?.type || '').toUpperCase() === 'URL'
  );
  if (!button || !/\{\{\d+\}\}/.test(button.url || '')) return null;

  const staticPrefix = String(button.url).split(/\{\{\d+\}\}/)[0];
  const text = /\/invitation\/$/.test(staticPrefix)
    ? String(invitationCode)
    : `${lang === 'en' ? 'en' : 'ar'}/invitation/${invitationCode}`;

  return {
    type: 'button',
    sub_type: 'url',
    index: String(button.index || 0),
    parameters: [{ type: 'text', text }],
  };
}

/**
 * Build body params for a post-event Taqnyat template variable.
 *
 * Mirrors `getEventBodyParams` but adds an `access` context branch so
 * templates can reference `{{access.link}}` and `{{access.expiresAt}}` in
 * their varMapping. Falls back to a sensible 3-param shape when the
 * template has no varMapping.
 */
function getPostEventBodyParams(event, guestName, taqnyatTemplate, accessCtx = {}, extraContext = {}) {
  const fallback = () => [
    guestName || 'ضيفنا الكريم',
    event.eventDetails?.title || 'مناسبة',
    accessCtx.link || '',
  ];

  if (
    !taqnyatTemplate
    || !Array.isArray(taqnyatTemplate.varMapping)
    || taqnyatTemplate.varMapping.length === 0
  ) {
    return fallback();
  }

  // See note in getEventBodyParams — Mongoose subdocs need .toObject() before spread.
  const ed = event.eventDetails?.toObject?.() || event.eventDetails || {};
  const loc = ed.location?.toObject?.() || ed.location || {};
  const mapUrl =
    loc.latitude != null && loc.longitude != null
      ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
      : '';
  const ctx = {
    guest: { name: guestName || 'ضيفنا الكريم' },
    eventDetails: {
      ...ed,
      dateFormatted: formatDate(ed.date),
      location: { ...loc, mapUrl },
    },
    host:
      event.host && typeof event.host === 'object'
        ? { name: event.host.name || event.host.username || '' }
        : {},
    access: {
      link: accessCtx.link || '',
      expiresAt: accessCtx.expiresAt || '',
    },
    ...extraContext,
  };

  const ordered = [...taqnyatTemplate.varMapping].sort((a, b) => {
    const ai = parseInt(String(a.placeholder).replace(/\D/g, ''), 10) || 0;
    const bi = parseInt(String(b.placeholder).replace(/\D/g, ''), 10) || 0;
    return ai - bi;
  });

  return ordered.map((m) => {
    const value = m.sourceKey
      .split('.')
      .reduce((acc, k) => (acc == null ? acc : acc[k]), ctx);
    const resolved =
      value === undefined || value === null || value === '' ? m.fallback : value;
    return resolved == null ? '' : String(resolved);
  });
}

/**
 * Short SMS-fallback body for post-event access links. Used when the
 * recipient has no WhatsApp capability and Taqnyat falls back to SMS via
 * the `payload.sms` field.
 */
function buildPostEventAccessLinkSmsBody(event, guestName, accessLink) {
  const title = event.eventDetails?.title || 'مناسبة';
  const name = guestName ? `${guestName}، ` : '';
  return `${name}شكراً لحضورك ${title}.\nشاهد صور ومقاطع المناسبة من هنا:\n${accessLink}`;
}

module.exports = {
  TAQNYAT_SENDER,
  formatDate,
  resolveTaqnyatTemplate,
  getEventBodyParams,
  buildSmsBody,
  getEventImageUrl,
  buildInvitationUrlButton,
  getPostEventBodyParams,
  buildPostEventAccessLinkSmsBody,
};
