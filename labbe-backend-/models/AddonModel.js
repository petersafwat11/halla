const mongoose = require('mongoose');
const { ADDON_TYPES } = require('../src/shared/constants/addons');

const addonSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    addonType: { type: String, enum: Object.values(ADDON_TYPES), required: true },
    // For extra_invites: quantity = number of extra invites
    // For extra_reminders: quantity = number of extra reminder sends
    // For design_template: quantity = 1, templateType holds the tier
    // For business_customization: quantity = 1
    quantity: { type: Number, default: 1 },
    templateType: { type: String, default: null }, // 'ready_made', 'custom_male', etc.
    price: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    status: {
      type: String,
      // FLOW-10-F01: `pending_provisioning` covers business-customization
      // and any future addon type that requires manual operator
      // approval after payment. Admin endpoint flips it to `active`.
      //
      // B-4: `failed_quota` records the case where the charge succeeded
      // but the downstream quota application threw. Admin reconciliation
      // pairs this row with the corresponding pending-refund audit entry.
      enum: [
        'pending',
        'pending_3ds',
        'pending_provisioning',
        'active',
        'fulfilled',
        'cancelled',
        'failed_quota',
      ],
      default: 'pending',
    },
    scope: { type: String, enum: ['event', 'pool', 'org'], default: 'event' },
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

addonSchema.index({ userId: 1, status: 1 });
addonSchema.index({ subscriptionId: 1 });
addonSchema.index({ eventId: 1 });

const Addon = mongoose.model('Addon', addonSchema);
module.exports = Addon;
