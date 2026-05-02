const mongoose = require('mongoose');

const businessSetupFeeSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    amount: { type: Number, default: 1200 },
    currency: { type: String, default: 'SAR' },
    paidAt: { type: Date, default: null },
    notes: String,
  },
  { timestamps: true }
);

businessSetupFeeSchema.index({ organizationId: 1, status: 1 });
const BusinessSetupFee = mongoose.model('BusinessSetupFee', businessSetupFeeSchema);
module.exports = BusinessSetupFee;
