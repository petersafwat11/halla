const crypto = require("crypto");
const OutboundMessage = require("../../models/OutboundMessageModel");
const logger = require("../shared/utils/logger");

const REDACTED = "[REDACTED_SENSITIVE_CONTENT]";

function hashContent(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function sanitizePayload(payload, { sensitive = false } = {}) {
  const copy = JSON.parse(JSON.stringify(payload || {}));
  if (!sensitive) return { payload: copy, contentRedacted: false };

  let original = null;
  if (typeof copy.body === "string") {
    original = copy.body;
    copy.body = REDACTED;
  } else if (typeof copy.text?.body === "string") {
    original = copy.text.body;
    copy.text.body = REDACTED;
  }

  return {
    payload: copy,
    contentRedacted: original !== null,
    contentHash: original === null ? null : hashContent(original),
    contentLength: original === null ? null : original.length,
  };
}

function compactProviderResponse(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return value;
  // Axios errors can contain request/config objects and authorization headers.
  return JSON.parse(JSON.stringify(value));
}

async function recordOutboundMessage({
  channel,
  messageType,
  recipients,
  sender = null,
  payload,
  result,
  context = {},
  sensitive = false,
}) {
  const normalizedRecipients = Array.isArray(recipients) ? recipients : [recipients];
  const sanitized = sanitizePayload(payload, { sensitive });
  const success = result?.success === true && Boolean(result?.messageId);
  const now = new Date();

  try {
    const record = await OutboundMessage.create({
      provider: "taqnyat",
      providerMessageId: result?.messageId || null,
      channel,
      messageType,
      status: success ? "sent" : "failed",
      recipients: normalizedRecipients,
      recipientCount: normalizedRecipients.length,
      sender,
      requestPayload: sanitized.payload,
      providerResponse: compactProviderResponse(result?.raw || result?.details || null),
      templateName: payload?.template?.name || null,
      templateLanguage: payload?.template?.language?.code || null,
      contentRedacted: sanitized.contentRedacted,
      contentHash: sanitized.contentHash || null,
      contentLength: sanitized.contentLength || null,
      event: context.eventId || null,
      guest: context.guestId || null,
      user: context.userId || null,
      purpose: context.purpose || null,
      context: context.metadata || {},
      providerStatusCode: result?.statusCode || result?.code || null,
      cost: typeof result?.cost === "number" ? result.cost : null,
      currency: result?.currency || null,
      error: success
        ? undefined
        : {
            message: result?.error || "Provider send failed",
            code: result?.code ? String(result.code) : null,
            details: compactProviderResponse(result?.details || null),
          },
      sentAt: success ? now : null,
      failedAt: success ? null : now,
      deliveryHistory: [{ status: success ? "sent" : "failed", timestamp: now, source: "send_api" }],
    });
    return record;
  } catch (error) {
    // A provider success must never be retried just because observability failed;
    // doing so could duplicate the customer message. Emit a critical app log.
    logger.error("[taqnyat] failed to persist outbound message record", {
      channel,
      messageType,
      providerMessageId: result?.messageId || null,
      error: error.message,
    });
    return null;
  }
}

async function updateOutboundDeliveryStatus(messageId, status, timestamp = new Date()) {
  if (!messageId) return null;
  const at = timestamp ? new Date(timestamp) : new Date();
  return OutboundMessage.findOneAndUpdate(
    { provider: "taqnyat", providerMessageId: messageId },
    {
      $set: { status, lastDeliveryAt: at },
      $push: { deliveryHistory: { status, timestamp: at, source: "provider_webhook" } },
    },
    { new: true }
  );
}

module.exports = {
  recordOutboundMessage,
  updateOutboundDeliveryStatus,
  sanitizePayload,
};
