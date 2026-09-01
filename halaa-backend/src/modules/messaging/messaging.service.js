/**
 * Messaging Service (façade).
 *
 * Public API surface for the messaging module. Each method delegates to
 * a focused split file:
 *   - send: messaging.send.service.js
 *   - reminder: messaging.reminder.service.js
 *   - schedule: messaging.schedule.service.js
 *   - webhook: messaging.webhook.service.js
 *   - formatting helpers: messaging.formatting.js
 *
 * External consumers (events module, controllers, cron) should keep
 * importing from `./messaging.service` — this façade preserves the API.
 */

const send = require('./messaging.send.service');
const reminder = require('./messaging.reminder.service');
const schedule = require('./messaging.schedule.service');
const webhook = require('./messaging.webhook.service');

class MessagingService {
  // ---- send ----
  sendTestMessage(params) {
    return send.sendTestMessage(params);
  }
  sendInitialLaunchBatch(params) {
    return send.sendInitialLaunchBatch(params);
  }
  sendToGuest(params) {
    return send.sendToGuest(params);
  }
  sendBulk(params) {
    return send.sendBulk(params);
  }
  retryFailed(eventId, channel, userId, isAdmin = false, actorRole) {
    return send.retryFailed(eventId, channel, userId, isAdmin, actorRole);
  }

  // ---- reminder ----
  sendReminder(params) {
    return reminder.sendReminder(params);
  }

  // ---- schedule ----
  scheduleBulkSend(params) {
    return schedule.scheduleBulkSend(params);
  }

  // ---- webhook ----
  updateDeliveryStatus(messageId, status, timestamp) {
    return webhook.updateDeliveryStatus(messageId, status, timestamp);
  }
  markGuestAsSmsFallback(messageId) {
    return webhook.markGuestAsSmsFallback(messageId);
  }
  handleButtonResponse(params) {
    return webhook.handleButtonResponse(params);
  }
}

module.exports = new MessagingService();
