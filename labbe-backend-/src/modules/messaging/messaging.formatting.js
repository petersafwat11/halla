/**
 * Messaging formatting helpers.
 * Pure / DB-only utilities shared by the send / reminder / schedule splits.
 */

const TaqnyatTemplate = require('../../../models/TaqnyatTemplateModel');
const { formatRiyadh } = require('../../shared/utils/timezone');
const logger = require('../../shared/utils/logger');

const TAQNYAT_SENDER = process.env.TAQNYAT_SENDER_NAME || 'HalaaApp-AD';

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
 * Resolve the cached TaqnyatTemplate for an event.
 * Prefers `event.taqnyatTemplate.templateRef`; falls back to legacy
 * `event.invitationSettings.selectedTemplate.name`. Returns `null` when
 * neither is set (caller falls back to the 5-param shape).
 */
async function resolveTaqnyatTemplate(event) {
  try {
    const ref = event.taqnyatTemplate?.templateRef;
    if (ref) {
      const doc = await TaqnyatTemplate.findById(ref).lean();
      if (doc) return doc;
    }
    const legacyName = event.invitationSettings?.selectedTemplate?.name;
    if (legacyName) {
      return TaqnyatTemplate.findOne({ templateName: legacyName }).lean();
    }
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
function getEventBodyParams(event, guestName, taqnyatTemplate = null) {
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

  const ctx = {
    guest: { name: guestName || 'ضيفنا الكريم' },
    eventDetails: {
      ...(event.eventDetails || {}),
      dateFormatted: formatDate(event.eventDetails?.date),
    },
    host:
      event.host && typeof event.host === 'object'
        ? { name: event.host.name || event.host.username || '' }
        : {},
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
function getEventImageUrl(event) {
  const hasImageHeader =
    event.invitationSettings?.selectedTemplate?.hasImageHeader === true;
  if (!hasImageHeader) return null;

  const imagePath =
    event.visualTemplate?.bakedImagePath ||
    event.invitationSettings?.templateImage;
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return null;
}

module.exports = {
  TAQNYAT_SENDER,
  formatDate,
  resolveTaqnyatTemplate,
  getEventBodyParams,
  buildSmsBody,
  getEventImageUrl,
};
