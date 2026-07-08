/**
 * Messaging Controller (façade).
 * Re-exports HTTP handlers from the focused split files.
 */

const send = require('./messaging.send.controller');
const schedule = require('./messaging.schedule.controller');
const webhook = require('./messaging.webhook.controller');

module.exports = {
  // send
  sendToGuest: send.sendToGuest,
  sendBulk: send.sendBulk,
  retryFailed: send.retryFailed,
  sendReminder: send.sendReminder,

  // schedule
  scheduleSend: schedule.scheduleSend,

  // webhook
  webhook: webhook.webhook,
  webhookVerify: webhook.webhookVerify,
};
