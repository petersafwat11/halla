/**
 * Taqnyat API Client
 * Transport layer for Taqnyat SMS & WhatsApp APIs
 * @module infrastructure/taqnyat
 */

const axios = require('axios');
const { normalizePhoneNumber } = require('../shared/utils/phone');

// ============================================
// CONFIGURATION
// ============================================

const TAQNYAT_CONFIG = {
  baseUrl: process.env.TAQNYAT_BASE_URL || 'https://api.taqnyat.sa',
  waBaseUrl: process.env.TAQNYAT_WA_BASE_URL || 'https://api.taqnyat.sa/wa/v2',
  apiKey: process.env.TAQNYAT_API_KEY,
  senderName: process.env.TAQNYAT_SENDER_NAME || 'HalaaApp',
};

// SMS client
const smsClient = axios.create({
  baseURL: TAQNYAT_CONFIG.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TAQNYAT_CONFIG.apiKey}`,
  },
  timeout: 30000,
});

// WhatsApp client (separate base URL, same API key)
// 60s timeout because Meta-backed create calls regularly take >30s.
const waClient = axios.create({
  baseURL: TAQNYAT_CONFIG.waBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TAQNYAT_CONFIG.apiKey}`,
  },
  timeout: 60000,
});

// ============================================
// ERROR HANDLING
// ============================================

const TAQNYAT_ERRORS = {
  100: 'Invalid or missing parameter',
  401: 'Invalid API token',
  402: 'Invalid recipient or not allowed to send',
  429: 'Rate limit exceeded',
};

const handleWaError = (error) => {
  const data = error.response?.data || {};
  const code = data.message || error.response?.status;
  return {
    success: false,
    error: TAQNYAT_ERRORS[code] || data.reason || error.message,
    code,
    details: data.reason,
  };
};

/**
 * Taqnyat sometimes returns HTTP 200 with an error body like:
 * { "message": "402", "reason": "Invalid recipient" }
 * This helper detects that and returns a proper error object.
 */
const checkWaResponseForError = (data) => {
  const code = data?.message;
  if (code && TAQNYAT_ERRORS[code]) {
    return {
      success: false,
      error: TAQNYAT_ERRORS[code],
      code,
      details: data.reason,
    };
  }
  return null;
};

// ============================================
// SMS METHODS
// ============================================

const sendSMS = async (recipient, body, options = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key not configured');

  const payload = {
    recipients: [normalizePhoneNumber(recipient)],
    body,
    sender: options.sender || TAQNYAT_CONFIG.senderName,
    ...(options.scheduledDatetime && { scheduledDatetime: options.scheduledDatetime }),
  };

  const response = await smsClient.post('/v1/messages', payload);
  return {
    success: true,
    messageId: response.data.messageId,
    status: response.data.status || 'sent',
  };
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

  const response = await smsClient.post('/v1/messages', payload);
  return {
    success: true,
    messageId: response.data.messageId,
    recipientCount: normalizedRecipients.length,
    status: response.data.status || 'sent',
  };
};

// ============================================
// WHATSAPP METHODS
// ============================================

/**
 * Send WhatsApp template message (text only, no image header)
 * components: top-level array of { type, parameters } objects
 */
const sendWhatsAppTemplate = async (recipient, templateName, language, components, smsFallback = null) => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  try {
    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
      },
    };
    // Components go at top level (not inside template) per Taqnyat API spec
    if (components && components.length > 0) {
      payload.components = components;
    }
    // Native SMS failover: if the number has no WhatsApp, Taqnyat sends SMS automatically
    if (smsFallback) {
      payload.sms = smsFallback;
    }

    const response = await waClient.post('/messages/', payload);
    const err = checkWaResponseForError(response.data);
    if (err) return err;
    return {
      success: true,
      messageId: response.data.statuses?.[0]?.message_id || response.data.messages?.[0]?.id,
      status: 'sent',
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Send WhatsApp template with image header + body params
 * Used for event invitations with the card image.
 * smsFallback: { sender, body } — Taqnyat sends SMS automatically if recipient has no WhatsApp
 */
const sendWhatsAppTemplateWithImage = async (recipient, templateName, language, imageUrl, bodyParams, smsFallback = null) => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  try {
    // Build top-level components array per Taqnyat API spec
    const components = [
      {
        type: 'header',
        parameters: [{ type: 'image', image: { link: imageUrl } }],
      },
    ];
    if (bodyParams && bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParams.map((text) => ({ type: 'text', text })),
      });
    }

    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
      },
      // components at top level — NOT inside template{}
      components,
    };

    // Native SMS failover: Taqnyat sends SMS automatically if recipient has no WhatsApp.
    // The delivery webhook will return status: 'no_capability' for the WA leg.
    if (smsFallback) {
      payload.sms = smsFallback;
    }

    const response = await waClient.post('/messages/', payload);
    const err = checkWaResponseForError(response.data);
    if (err) return err;
    return {
      success: true,
      messageId: response.data.statuses?.[0]?.message_id || response.data.messages?.[0]?.id,
      status: 'sent',
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Send WhatsApp plain text message (conversation/session message, 24hr window only)
 */
const sendWhatsAppText = async (recipient, text) => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  try {
    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'text',
      text: { body: text },
    };
    const response = await waClient.post('/messages/', payload);
    const err = checkWaResponseForError(response.data);
    if (err) return err;
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      status: 'sent',
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Send WhatsApp image with caption (conversation message, 24hr window only)
 */
const sendWhatsAppImage = async (recipient, imageUrl, caption) => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  try {
    const payload = {
      to: normalizePhoneNumber(recipient),
      type: 'image',
      image: { link: imageUrl, caption },
    };

    const response = await waClient.post('/messages/', payload);
    const err = checkWaResponseForError(response.data);
    if (err) return err;
    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      status: 'sent',
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Upload an image to Taqnyat media store for use as a template header example.
 * Returns { success, mediaId } — mediaId goes into header_handle when creating the template.
 * imageBuffer: Buffer | stream, mimeType: 'image/jpeg' | 'image/png', filename: string
 */
const uploadTemplateMedia = async (imageBuffer, mimeType = 'image/jpeg', filename = 'header.jpg') => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', imageBuffer, { filename, contentType: mimeType });

    const response = await waClient.post('/templates/media/', form, {
      headers: { ...form.getHeaders() },
    });

    // Taqnyat may return the ID under different keys — check all possibilities
    const mediaId = response.data.id || response.data.mediaId || response.data.media_id
      || (Array.isArray(response.data) ? response.data[0]?.id : null);

    return {
      success: true,
      mediaId,
      raw: response.data, // expose raw for debugging
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Create WhatsApp template and submit to Meta for approval
 */
const createTemplate = async (name, category, language, components, options = {}) => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  try {
    const payload = {
      name,
      category,
      language,
      allow_category_change: options.allowCategoryChange !== false, // default true
      components,
    };
    const response = await waClient.post('/templates/', payload);
    return {
      success: true,
      templateId: response.data.id,
      status: response.data.statuses || response.data.status || 'PENDING',
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Get all templates (to check approval status).
 *
 * Taqnyat's GET /wa/v2/templates/ requires a JSON body { sync: 1 } — without
 * it the API returns { message: "401", reason: "No Data" } and silently yields
 * zero templates. `sync: 1` forces a refresh from Meta; `sync: 0` returns the
 * cached list. We use 1 so callers always see the freshest status.
 */
const getTemplates = async () => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  try {
    const response = await waClient.request({
      method: 'GET',
      url: '/templates/',
      data: { sync: 1 },
    });
    const data = response.data;
    const err = checkWaResponseForError(data);
    if (err) return err;
    // Taqnyat API returns templates under waba_templates
    const templates = data.waba_templates || data.data || (Array.isArray(data) ? data : []);
    return {
      success: true,
      templates,
    };
  } catch (error) {
    return handleWaError(error);
  }
};

/**
 * Delete a WhatsApp template upstream on Meta via Taqnyat.
 * Per Taqnyat docs the DELETE accepts a JSON body { name, id }.
 *
 * Quirk: Taqnyat's delete is inconsistent about the HTTP status code —
 * we have observed both `200 { message: "201", reason: "success" }` and
 * `400 { message: "200", reason: "template = ... was deleted" }` on
 * a clean delete. We override validateStatus so axios doesn't throw on
 * those 4xx-success cases and inspect the body ourselves: any `message`
 * in the 2xx range, or a `reason` containing "deleted"/"success", is
 * treated as success.
 */
const deleteTemplate = async (name, id) => {
  if (!TAQNYAT_CONFIG.apiKey) {
    throw new Error('Taqnyat API key is not configured');
  }
  if (!name && !id) {
    throw new Error('deleteTemplate requires at least name or id');
  }
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
    const isSuccess =
      /^2\d\d$/.test(code) ||
      /deleted|success/i.test(reason);
    if (isSuccess) {
      return { success: true, raw: data };
    }
    // Real error — surface it through the same channel as the other helpers.
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

/**
 * Check account balance
 */
const checkBalance = async () => {
  if (!TAQNYAT_CONFIG.apiKey) throw new Error('Taqnyat API key not configured');

  const response = await smsClient.get('/account/balance');
  return {
    success: true,
    balance: response.data.balance,
    currency: response.data.currency || 'SAR',
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
};
