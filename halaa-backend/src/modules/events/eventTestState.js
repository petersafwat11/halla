// Test approval is explicit; account/provider metadata does not invalidate it.
async function applyEventTestState(event) {
  const source = event.toObject?.() || event;
  event.testMessageCurrent = Boolean(source.testMessageSent);
  event.testMessageSent = event.testMessageCurrent;
  return event;
}
module.exports = { applyEventTestState };
