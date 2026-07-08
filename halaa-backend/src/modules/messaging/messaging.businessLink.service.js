/**
 * Business Checkout-Link Delivery
 *
 * Sends the mode-B hosted checkout link to a business over WhatsApp using the
 * approved `business_checkout` template, with native SMS failover. Returns a
 * normalized `{ success, messageId, error }` shape consumed by the assignment
 * service's `deliveryAttempts` recorder.
 *
 * @module modules/messaging/messaging.businessLink.service
 */

const taqnyat = require('../../infrastructure/taqnyat');
const logger = require('../../shared/utils/logger');

const TEMPLATE_NAME = process.env.WA_BUSINESS_CHECKOUT_TEMPLATE || 'business_checkout';
const TEMPLATE_LANG = process.env.WA_BUSINESS_CHECKOUT_LANG || 'ar';

/**
 * @param {Object} p
 * @param {string} p.to - recipient phone
 * @param {string} p.link - checkout URL
 * @param {string} [p.businessName]
 * @returns {Promise<{success:boolean,messageId?:string,error?:string}>}
 */
async function sendCheckoutLink({ to, link, businessName }) {
  if (!to) return { success: false, error: 'no_recipient' };
  try {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: businessName || '' },
          { type: 'text', text: link },
        ],
      },
    ];
    const smsFallback = {
      // Native Taqnyat SMS failover body if WhatsApp is undeliverable.
      body: `هلا أعمال: لإتمام اشتراك منشأتك، افتح الرابط: ${link}`,
    };
    return await taqnyat.sendWhatsAppTemplate(to, TEMPLATE_NAME, TEMPLATE_LANG, components, smsFallback);
  } catch (err) {
    logger.warn('[businessLink] WhatsApp send failed', { error: err?.message });
    return { success: false, error: err?.message || 'send_failed' };
  }
}

/**
 * Explicit SMS fallback (used when WhatsApp returned a non-failover error).
 * @returns {Promise<{success:boolean,messageId?:string,error?:string}>}
 */
async function sendSmsFallback({ to, link }) {
  if (!to) return { success: false, error: 'no_recipient' };
  try {
    return await taqnyat.sendSMS(to, `هلا أعمال: لإتمام اشتراك منشأتك، افتح الرابط: ${link}`);
  } catch (err) {
    return { success: false, error: err?.message || 'sms_failed' };
  }
}

module.exports = { sendCheckoutLink, sendSmsFallback };
