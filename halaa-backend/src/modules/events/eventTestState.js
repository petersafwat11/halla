const { resolveTaqnyatTemplate, invitationFingerprintMatches } = require('../messaging/messaging.formatting');

// Re-evaluate on read: account/template changes can invalidate a previously sent test.
async function applyEventTestState(event) {
  const source = event.toObject?.() || event;
  const template = source.testMessageSent ? await resolveTaqnyatTemplate(source) : null;
  const current = Boolean(source.testMessageSent && template && invitationFingerprintMatches(source, template));
  event.testMessageCurrent = current;
  event.testMessageSent = current;
  return event;
}
module.exports = { applyEventTestState };
