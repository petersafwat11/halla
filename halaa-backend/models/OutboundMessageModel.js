/**
 * Durable record of every outbound message attempted through a provider.
 *
 * Message records are append-only. Delivery webhooks may update only the
 * delivery state/history after the initial attempt has been recorded.
 */

const mongoose = require("mongoose");

const deliveryEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    source: { type: String, default: "provider_webhook" },
  },
  { _id: false }
);

const outboundMessageSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, default: "taqnyat", index: true },
    providerMessageId: { type: String, default: null, index: true },
    channel: { type: String, enum: ["sms", "whatsapp"], required: true, index: true },
    effectiveChannel: { type: String, enum: ["sms", "whatsapp"], required: true, index: true },
    messageType: {
      type: String,
      enum: ["sms", "bulk_sms", "template", "template_image", "text", "image"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "delivered", "read", "rejected", "unknown"],
      required: true,
      index: true,
    },
    recipients: [{ type: String, required: true }],
    recipientCount: { type: Number, required: true, min: 1 },
    sender: { type: String, default: null },

    // Sanitized provider request. Authentication headers are never included.
    requestPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    // The useful, sanitized provider response/error envelope.
    providerResponse: { type: mongoose.Schema.Types.Mixed, default: null },

    templateName: { type: String, default: null, index: true },
    templateLanguage: { type: String, default: null },
    contentRedacted: { type: Boolean, default: false },
    contentHash: { type: String, default: null },
    contentLength: { type: Number, default: null },

    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null, index: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "Guest", default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    purpose: { type: String, default: null, index: true },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },

    providerStatusCode: { type: String, default: null },
    cost: { type: Number, default: null },
    currency: { type: String, default: null },
    error: {
      message: { type: String, default: null },
      code: { type: String, default: null },
      details: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    sentAt: { type: Date, default: null, index: true },
    failedAt: { type: Date, default: null },
    lastDeliveryAt: { type: Date, default: null },
    statusUpdatedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    deliveryHistory: { type: [deliveryEventSchema], default: [] },
  },
  { timestamps: true }
);

outboundMessageSchema.index({ event: 1, createdAt: -1 });
outboundMessageSchema.index({ guest: 1, createdAt: -1 });
outboundMessageSchema.index({ provider: 1, providerMessageId: 1 });
outboundMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("OutboundMessage", outboundMessageSchema);
