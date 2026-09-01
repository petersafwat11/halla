/**
 * Messaging formatting helpers.
 * Pure / DB-only utilities shared by the send / reminder / schedule splits.
 */

const TaqnyatTemplate = require('../../../models/TaqnyatTemplateModel');
const { formatRiyadh } = require('../../shared/utils/timezone');
const logger = require('../../shared/utils/logger');
const { invitationAllowsReply } = require('../../shared/constants');
const { AppError } = require('../../shared/errors');

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
 * Format only the weekday name in Asia/Riyadh.
 */
function formatDay(date, lang = 'ar') {
  if (!date) return '';
  return formatRiyadh(date, {
    style: 'date',
    locale: lang === 'ar' ? 'ar-SA' : 'en-US',
    options: {
      year: undefined,
      month: undefined,
      day: undefined,
      weekday: 'long',
    },
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
      dayFormatted: formatDay(ed.date),
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
  const responseLink = invitationAllowsReply(event?.invitationType) && rsvpLink
    ? `\n${rsvpLink}`
    : '';
  return `${name}أنت مدعو لحضور ${title}\nبتاريخ ${date} الساعة ${time}\n${location}${responseLink}`;
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
  if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
    const publicBase = String(
      process.env.PUBLIC_MEDIA_BASE_URL || process.env.FRONTEND_URL || ''
    ).replace(/\/$/, '');
    if (publicBase.startsWith('http')) {
      return `${publicBase}/${imagePath.replace(/^\//, '')}`;
    }
  }
  return null;
}

/**
 * Resolve the event-specific Step 3 image for an IMAGE-header template.
 *
 * An approved IMAGE header is a required template component. Falling back to
 * the text-only send path would produce a malformed Taqnyat payload, so fail
 * before the provider call with an actionable event configuration error.
 */
function getRequiredEventImageUrl(event, taqnyatTemplate = null) {
  const imageUrl = getEventImageUrl(event, taqnyatTemplate);
  if (taqnyatTemplate?.hasImageHeader === true && !imageUrl) {
    throw new AppError(
      'The selected WhatsApp template requires a public invitation image from Step 3.',
      400,
      'TAQNYAT_TEMPLATE_IMAGE_REQUIRED'
    );
  }
  return imageUrl;
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
      dayFormatted: formatDay(ed.date),
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

const crypto = require('crypto');

function deepSortObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepSortObject);
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = deepSortObject(obj[key]);
      return acc;
    }, {});
}

/**
 * Compute canonical SHA-256 fingerprint for message-affecting content.
 * Any change to templates, cards, or event details will produce a different hash.
 *
 * @param {Object} event
 * @param {Object} [resolvedTemplate=null]
 * @returns {string}
 */
function computeInvitationFingerprint(event, resolvedTemplate = null) {
  if (!event) return '';
  const ed = event.eventDetails?.toObject?.() || event.eventDetails || {};
  const vt = event.visualTemplate?.toObject?.() || event.visualTemplate || {};
  const loc = ed.location?.toObject?.() || ed.location || {};
  const replies = event.guestReplies?.toObject?.() || event.guestReplies || {};

  const hostName =
    event.host && typeof event.host === 'object'
      ? event.host.name || event.host.username || ''
      : '';

  const mapUrl =
    loc.latitude != null && loc.longitude != null
      ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
      : '';

  const renderedBodyParams = getEventBodyParams(event, 'SAMPLE_GUEST', resolvedTemplate);
  const resolvedImageUrl = getEventImageUrl(event, resolvedTemplate);

  const payload = {
    templateRef: event.taqnyatTemplate?.templateRef?.toString?.() || null,
    templateName: resolvedTemplate?.templateName || null,
    templateLanguage: resolvedTemplate?.language || 'ar',
    templateUpdatedAt: resolvedTemplate?.updatedAt ? new Date(resolvedTemplate.updatedAt).toISOString() : null,
    templateContract: deepSortObject({
      bodyText: resolvedTemplate?.bodyText || '',
      hasImageHeader: Boolean(resolvedTemplate?.hasImageHeader),
      varMapping: resolvedTemplate?.varMapping || [],
      buttons: resolvedTemplate?.buttons || [],
    }),
    visualTemplateRef: vt.templateRef?.toString?.() || null,
    fieldValues: deepSortObject(vt.fieldValues || {}),
    bakedImagePath: vt.bakedImagePath || event.templateImage || null,
    resolvedImageUrl: resolvedImageUrl || null,
    renderedBodyParams,
    title: (ed.title || '').trim(),
    type: ed.type || '',
    date: ed.date ? new Date(ed.date).toISOString().slice(0, 10) : '',
    time: (ed.time || '').trim(),
    hostName: hostName.trim(),
    location: {
      address: (loc.address || '').trim(),
      placeId: loc.placeId || null,
      latitude: loc.latitude != null ? Number(loc.latitude) : null,
      longitude: loc.longitude != null ? Number(loc.longitude) : null,
      mapUrl,
    },
    invitationType: event.invitationType || 'reply_and_qr',
    guestReplies: {
      onAttend: (replies.onAttend || '').trim(),
      onAbsent: (replies.onAbsent || '').trim(),
    },
  };

  return crypto.createHash('sha256').update(JSON.stringify(deepSortObject(payload))).digest('hex');
}

module.exports = {
  TAQNYAT_SENDER,
  formatDate,
  formatDay,
  resolveTaqnyatTemplate,
  getEventBodyParams,
  buildSmsBody,
  getEventImageUrl,
  getRequiredEventImageUrl,
  getPostEventBodyParams,
  buildPostEventAccessLinkSmsBody,
  computeInvitationFingerprint,
};
