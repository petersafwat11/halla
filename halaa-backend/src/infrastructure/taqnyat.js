/**
 * Taqnyat API client.
 * Transport for SMS (`/v1/messages`) and WhatsApp (`/wa/v2`) per the
 * upstream Postman collection (taqnyat-sa/taqnyat-sms · y0s9qd0).
 *
 * Response shapes the WA endpoints return (verified against dev.taqnyat.sa):
 *   - Template send → { type: "whatsapp", statuses: [{ message_id, recipient }] }
 *   - Free-form text/image send → { type, statuses: { message_id, recipient } }  // singleton object, NOT array
 *   - Templates list (sync=1) → { waba_templates: [...] }
 *   - Create template → { id, category, statuses: "PENDING" }                    // statuses is a string here
 *   - Upload media → { id }
 *   - Delete → { message: "201", reason: "success" }                              // sometimes HTTP 400 with same body
 *
 * Any 200 response that does NOT yield a `message_id` is treated as a
 * failure — Taqnyat occasionally returns 200 with an unfamiliar error
 * code that the legacy success path swallowed silently.
 *
 * @module infrastructure/taqnyat
 */

const axios = require('axios');
const { normalizePhoneNumber } = require('../shared/utils/phone');
const logger = require('../shared/utils/logger');
const { recordOutboundMessage } = require('./outboundMessageLog');

const TAQNYAT_CONFIG = {
  baseUrl: process.env.TAQNYAT_BASE_URL || 'https://api.taqnyat.sa',
  waBaseUrl: process.env.TAQNYAT_WA_BASE_URL || 'https://api.taqnyat.sa/wa/v2',
  apiKey: process.env.TAQNYAT_API_KEY,
  senderName: process.env.TAQNYAT_SENDER_NAME || 'HalaaApp',
};

const smsClient = axios.create({
  baseURL: TAQNYAT_CONFIG.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TAQNYAT_CONFIG.apiKey}`,
  },
  timeout: 30000,
});

// 60s timeout because Meta-backed create calls regularly take >30s.
const waClient = axios.create({
  baseURL: TAQNYAT_CONFIG.waBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TAQNYAT_CONFIG.apiKey}`,
  },
  timeout: 60000,
});

const TAQNYAT_ERRORS = {
  100: 'Invalid or missing parameter',
  401: 'Invalid API token',
  402: 'Invalid recipient or not allowed to send',
  429: 'Rate limit exceeded',
  132001: 'Template name does not exist',
};

const handleWaError = (error) => {
  const data = error.response?.data || {};
  const code = data.message || error.response?.status;
  return {
    success: false,
    error: TAQNYAT_ERRORS[code] || data.reason || error.message,
    code,
    details: data.reason,
    raw: data,
  };
};

/**
 * Taqnyat sometimes returns HTTP 200 with an error body like:
 *   { "message": "402", "reason": "Invalid recipient" }
 * Anything where `message` is a non-2xx numeric string is treated as an
 * error — the spec only documents 2xx success codes inline-with-payload,
 * so any unrecognised numeric `message` is upstream telling us it failed.
 */
const checkWaResponseForError = (data) => {
  const code = data?.message;
  if (!code) return null;
  if (TAQNYAT_ERRORS[code]) {
    return { success: false, error: TAQNYAT_ERRORS[code], code, details: data.reason };
  }
  if (/^\d+$/.test(String(code)) && !/^2\d\d$/.test(String(code))) {
    return {
      success: false,
      error: data.reason || `Taqnyat error code ${code}`,
      code,
      details: data.reason,
    };
  }
  return null;
};

/**
 * Pull the `message_id` out of the WA send response. The spec returns
 * `statuses` as an array for template sends and as a singleton object
 * for free-form text/image sends.
 */
const extractWaMessageId = (data) => {
  if (!data) return null;
  if (Array.isArray(data.statuses)) return data.statuses[0]?.message_id || null;
  if (data.statuses && typeof data.statuses === 'object') return data.statuses.message_id || null;
  return data.messages?.[0]?.id || null;
};

/**
 * After a 200 response, require either a recognized error envelope or a
 * concrete `message_id`. A 200 with neither is "soft failure" — Taqnyat
 * accepted the request but Meta did not queue a message.
 */
const finalizeWaResult = (data, context) => {
  const err = checkWaResponseForError(data);
  if (err) return { ...err, raw: data };

  const messageId = extractWaMessageId(data);
  if (!messageId) {
    logger.warn('[taqnyat] WA 200 response had no message_id', { context, raw: data });
    return {
      success: false,
      error: 'Taqnyat accepted the request but returned no message_id',
      code: 'NO_MESSAGE_ID',
      details: data,
    };
  }
  return { success: true, messageId, status: 'sent', raw: data };
};

async function persistResult(logData, result) {
  const record = await recordOutboundMessage({ ...logData, result });
  return record ? { ...result, outboundMessageId: record._id.toString() } : result;
}

// ============================================
// SMS
// ============================================

const sendSMS = async (recipient, body, options = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key not configured');

  const payload = {
    recipients: [normalizePhoneNumber(recipient)],
    body,
    sender: options.sender || TAQNYAT_CONFIG.senderName,
    ...(options.scheduledDatetime && { scheduledDatetime: options.scheduledDatetime }),
  };

  const logData = {
    channel: 'sms', messageType: 'sms', recipients: payload.recipients,
    sender: payload.sender, payload, context: options.logContext, sensitive: options.sensitive,
  };
  try {
    const response = await smsClient.post('/v1/messages', payload);
    // Spec: `{ statusCode, messageId, cost, currency, totalCount, msgLength, accepted, rejected }`
    const data = response.data || {};
    const result = data.messageId
      ? {
          success: true, messageId: data.messageId, status: 'sent', statusCode: data.statusCode,
          cost: data.cost, currency: data.currency, raw: data,
        }
      : { success: false, error: 'Taqnyat returned no messageId', code: 'NO_MESSAGE_ID', details: data, raw: data };
    if (!data.messageId) logger.warn('[taqnyat] SMS response had no messageId', { raw: data });
    return persistResult(logData, result);
  } catch (error) {
    await persistResult(logData, handleWaError(error));
    throw error;
  }
};

const sendBulkSMS = async (recipients, body, options = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key not configured');

  const normalizedRecipients = recipients.map(normalizePhoneNumber);
  const payload = {
    recipients: normalizedRecipients,
    body,
    sender: options.sender || TAQNYAT_CONFIG.senderName,
    ...(options.scheduledDatetime && { scheduledDatetime: options.scheduledDatetime }),
  };

  const logData = {
    channel: 'sms', messageType: 'bulk_sms', recipients: normalizedRecipients,
    sender: payload.sender, payload, context: options.logContext, sensitive: options.sensitive,
  };
  try {
    const response = await smsClient.post('/v1/messages', payload);
    const data = response.data || {};
    const result = data.messageId
      ? {
          success: true, messageId: data.messageId, recipientCount: normalizedRecipients.length,
          status: 'sent', statusCode: data.statusCode, cost: data.cost, currency: data.currency, raw: data,
        }
      : { success: false, error: 'Taqnyat returned no messageId', code: 'NO_MESSAGE_ID', details: data, raw: data };
    if (!data.messageId) logger.warn('[taqnyat] bulk SMS response had no messageId', { raw: data });
    return persistResult(logData, result);
  } catch (error) {
    await persistResult(logData, handleWaError(error));
    throw error;
  }
};

// ============================================
// WHATSAPP
// ============================================

/**
 * Send a WhatsApp template (text-only / no image header).
 * `components` is the top-level array required by the Taqnyat spec —
 * `[{ type: "body", parameters: [...] }]`.
 */
const sendWhatsAppTemplate = async (recipient, templateName, language, components, smsFallback = null, logOptions = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  try {
    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'template',
      template: { name: templateName, language: { code: language } },
    };
    if (components && components.length > 0) payload.components = components;
    // Native SMS failover — Taqnyat dispatches SMS automatically when
    // the recipient has no WhatsApp capability.
    if (smsFallback) payload.sms = smsFallback;

    const response = await waClient.post('/messages/', payload);
    return persistResult({
      channel: 'whatsapp', messageType: 'template', recipients: [payload.to],
      sender: smsFallback?.sender || null, payload, context: logOptions.logContext,
      sensitive: logOptions.sensitive,
    }, finalizeWaResult(response.data, { templateName, recipient }));
  } catch (error) {
    const result = handleWaError(error);
    const payload = {
      to: normalizePhoneNumber(recipient), type: 'template',
      template: { name: templateName, language: { code: language } }, components,
      ...(smsFallback && { sms: smsFallback }),
    };
    return persistResult({
      channel: 'whatsapp', messageType: 'template', recipients: [payload.to],
      sender: smsFallback?.sender || null, payload, context: logOptions.logContext,
      sensitive: logOptions.sensitive,
    }, result);
  }
};

/**
 * Send a WhatsApp template with an image header + body params.
 */
const sendWhatsAppTemplateWithImage = async (
  recipient,
  templateName,
  language,
  imageUrl,
  bodyParams,
  smsFallback = null,
  logOptions = {},
  additionalComponents = []
) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  const components = [
    { type: 'header', parameters: [{ type: 'image', image: { link: imageUrl } }] },
  ];
  if (bodyParams && bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((text) => ({ type: 'text', text })),
    });
  }
  components.push(...(additionalComponents || []).filter(Boolean));
  try {
    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'template',
      template: { name: templateName, language: { code: language } },
      components,
    };
    if (smsFallback) payload.sms = smsFallback;

    const response = await waClient.post('/messages/', payload);
    return persistResult({
      channel: 'whatsapp', messageType: 'template_image', recipients: [payload.to],
      sender: smsFallback?.sender || null, payload, context: logOptions.logContext,
      sensitive: logOptions.sensitive,
    }, finalizeWaResult(response.data, { templateName, recipient, imageUrl }));
  } catch (error) {
    const result = handleWaError(error);
    const payload = {
      to: normalizePhoneNumber(recipient), type: 'template',
      template: { name: templateName, language: { code: language } },
      components,
      ...(smsFallback && { sms: smsFallback }),
    };
    return persistResult({
      channel: 'whatsapp', messageType: 'template_image', recipients: [payload.to],
      sender: smsFallback?.sender || null, payload, context: logOptions.logContext,
      sensitive: logOptions.sensitive,
    }, result);
  }
};

/** Free-form WhatsApp text (24-hr session window only). */
const sendWhatsAppText = async (recipient, text, logOptions = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  try {
    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'text',
      text: { body: text },
    };
    const response = await waClient.post('/messages/', payload);
    return persistResult({
      channel: 'whatsapp', messageType: 'text', recipients: [payload.to], payload,
      context: logOptions.logContext, sensitive: logOptions.sensitive,
    }, finalizeWaResult(response.data, { type: 'text', recipient }));
  } catch (error) {
    const payload = { to: normalizePhoneNumber(recipient), type: 'text', text: { body: text } };
    return persistResult({
      channel: 'whatsapp', messageType: 'text', recipients: [payload.to], payload,
      context: logOptions.logContext, sensitive: logOptions.sensitive,
    }, handleWaError(error));
  }
};

/** Free-form WhatsApp image with caption (24-hr session window only). */
const sendWhatsAppImage = async (recipient, imageUrl, caption, logOptions = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  try {
    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'image',
      image: { link: imageUrl, caption },
    };
    const response = await waClient.post('/messages/', payload);
    return persistResult({
      channel: 'whatsapp', messageType: 'image', recipients: [payload.to], payload,
      context: logOptions.logContext, sensitive: logOptions.sensitive,
    }, finalizeWaResult(response.data, { type: 'image', recipient, imageUrl }));
  } catch (error) {
    const payload = { to: normalizePhoneNumber(recipient), type: 'image', image: { link: imageUrl, caption } };
    return persistResult({
      channel: 'whatsapp', messageType: 'image', recipients: [payload.to], payload,
      context: logOptions.logContext, sensitive: logOptions.sensitive,
    }, handleWaError(error));
  }
};

/**
 * Upload an image to Taqnyat's template-media store.
 * Returns the media id used as `header_handle` when creating a template.
 */
const uploadTemplateMedia = async (imageBuffer, mimeType = 'image/jpeg', filename = 'header.jpg') => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', imageBuffer, { filename, contentType: mimeType });

    const response = await waClient.post('/templates/media/', form, {
      headers: { ...form.getHeaders() },
    });

    const data = response.data || {};
    // Spec: `{ id }`. Defensive fallbacks for any provider quirks.
    const mediaId =
      data.id ||
      data.mediaId ||
      data.media_id ||
      (Array.isArray(data) ? data[0]?.id : null);

    if (!mediaId) {
      logger.warn('[taqnyat] uploadTemplateMedia returned no id', { raw: data });
      return { success: false, error: 'No media id returned', code: 'NO_MEDIA_ID', raw: data };
    }
    return { success: true, mediaId, raw: data };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Submit a WhatsApp template to Meta for approval.
 * Spec response: `{ id, category, statuses: "PENDING" }`.
 */
const createTemplate = async (name, category, language, components, options = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  try {
    const payload = {
      name,
      category,
      language,
      allow_category_change: options.allowCategoryChange !== false,
      components,
    };
    const response = await waClient.post('/templates/', payload);
    const data = response.data || {};
    const err = checkWaResponseForError(data);
    if (err) return err;
    return {
      success: true,
      templateId: data.id,
      // `statuses` is a string here (not an array). Older clients may
      // also send `status`; preserve both fallbacks.
      status: (typeof data.statuses === 'string' ? data.statuses : data.status) || 'PENDING',
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Fetch all templates from Meta via Taqnyat. Without `sync: 1` the API
 * returns `{ message: "401", reason: "No Data" }` and silently yields no
 * templates — `sync: 1` forces a fresh pull from Meta.
 */
const getTemplates = async () => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  try {
    const response = await waClient.request({
      method: 'GET',
      url: '/templates/',
      data: { sync: 1 },
    });
    const data = response.data || {};
    const err = checkWaResponseForError(data);
    if (err) return err;
    const templates = data.waba_templates || data.data || (Array.isArray(data) ? data : []);
    return { success: true, templates };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Hard-delete a template upstream. Taqnyat is inconsistent about HTTP
 * status on success — we have observed both `200 { message: "201" }` and
 * `400 { message: "200", reason: "template = ... was deleted" }`. The
 * `validateStatus: () => true` lets us inspect the body ourselves.
 */
const deleteTemplate = async (name, id) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key is not configured');
  if (!name && !id) throw new Error('deleteTemplate requires at least name or id');
  try {
    const response = await waClient.request({
      method: 'DELETE',
      url: '/templates/',
      data: { name, id },
      validateStatus: () => true,
    });
    const data = response.data || {};
    const code = String(data.message || response.status);
    const reason = String(data.reason || '');
    const isSuccess = /^2\d\d$/.test(code) || /deleted|success/i.test(reason);
    if (isSuccess) return { success: true, raw: data };
    return {
      success: false,
      error: TAQNYAT_ERRORS[code] || reason || `Delete failed (status ${response.status})`,
      code,
      details: reason,
    };
  } catch (error) {
    return handleWaError(error);
  }
};

const checkBalance = async () => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key not configured');
  const response = await smsClient.get('/account/balance');
  const data = response.data || {};
  return {
    success: true,
    balance: data.balance,
    currency: data.currency || 'SAR',
    accountStatus: data.accountStatus,
    points: data.points,
  };
};

module.exports = {
  sendSMS,
  sendBulkSMS,
  sendWhatsAppTemplate,
  sendWhatsAppTemplateWithImage,
  sendWhatsAppText,
  sendWhatsAppImage,
  uploadTemplateMedia,
  createTemplate,
  getTemplates,
  deleteTemplate,
  checkBalance,
  TAQNYAT_CONFIG,
  // Transport injection point for isolated tests; never used by runtime code.
  __test: { smsClient, waClient },
};
