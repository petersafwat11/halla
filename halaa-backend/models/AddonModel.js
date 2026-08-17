const mongoose = require('mongoose');
const { ADDON_TYPES } = require('../src/shared/constants/addons');

const addonSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    addonType: { type: String, enum: Object.values(ADDON_TYPES), required: true },
    // For extra_invites: quantity = number of extra invites
    // For design_template: quantity = 1, templateType holds the tier
    // For business_customization: quantity = 1
    quantity: { type: Number, default: 1 },
    templateType: { type: String, default: null }, // 'ready_made', 'custom_male', etc.
    price: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    status: {
      type: String,
      // pending_provisioning: addon types that need manual operator approval
      //   after payment (e.g. business_customization). Admin endpoint flips
      //   it to active.
      // failed_quota: charge succeeded but the downstream quota application
      //   threw. Reconciliation pairs this with a pending_refund audit entry.
      // paid → queued → in_progress → fulfilled: managed-service (design
      //   template) workflow (§8).
      // refund_required / refunded: store-forced or policy refund states (§8).
      enum: [
        'pending',
        'pending_3ds',
        'pending_provisioning',
        'paid',
        'queued',
        'in_progress',
        'active',
        'fulfilled',
        'cancelled',
        'failed_quota',
        'refund_required',
        'refunded',
      ],
      default: 'pending',
    },
    scope: { type: String, enum: ['event', 'pool', 'org'], default: 'event' },

    // ── store / IAP provenance (ADD-01 · §8) ─────────────────────────────────
    // First-class unique provider transaction id: a re-delivered store webhook
    // hits the unique index and cannot double-grant (fixes P0-10, which relied
    // on a non-unique metadata field lookup).
    source: { type: String, default: null }, // moyasar | revenuecat | appstore | playstore
    providerTransactionId: { type: String, default: null },
    originalTransactionId: { type: String, default: null },
    store: { type: String, default: null },
    environment: { type: String, default: null },
    revenueCatEventId: { type: String, default: null },
    catalogCode: { type: String, default: null },
    catalogVersion: { type: String, default: null },
    catalogHash: { type: String, default: null },

    // Extra-invites clawback accounting (§8): how much of the granted delta is
    // still unused and therefore reclaimable on a refund.
    grantedDelta: { type: Number, default: null },
    clawedBackDelta: { type: Number, default: 0 },

    // Refund/reversal state, kept separate from fulfilment status so a
    // provider-forced refund on a delivered service is recorded WITHOUT
    // pretending the service work was undone (§8).
    refundState: {
      type: String,
      enum: ['none', 'refund_required', 'refunded', 'reversed', 'manual_review'],
      default: 'none',
    },
    refundedAt: { type: Date, default: null },
    refundReason: { type: String, default: null },

    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

addonSchema.index({ userId: 1, status: 1 });
addonSchema.index({ subscriptionId: 1 });
addonSchema.index({ eventId: 1 });
// Unique store transaction id (partial: only string values collide, so the many
// web/Moyasar add-ons with null providerTransactionId never conflict).
addonSchema.index(
  { providerTransactionId: 1 },
  { unique: true, partialFilterExpression: { providerTransactionId: { $type: 'string' } } }
);

const Addon = mongoose.model('Addon', addonSchema);
module.exports = Addon;
