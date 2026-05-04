const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      // Not required: email_verification OTPs do not have a phone number
      required: false,
      index: true,
    },
    // FLOW-02-F01: support email-based OTPs (e.g. email_verification)
    email: {
      type: String,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["login", "signup", "verify", "email_verification"],
      default: "login",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index - document auto-deletes after expiresAt
    },
    attempts: {
      type: Number,
      default: 0,
    },
    // FLOW-02-F02: soft-invalidation — mark as used instead of deleting on success
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups
otpSchema.index({ phoneNumber: 1, otp: 1 });
// FLOW-02-F01: index for email-based OTP lookups
otpSchema.index({ email: 1, type: 1 });

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;
