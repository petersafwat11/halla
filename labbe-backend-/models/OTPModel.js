const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["login", "signup", "verify"],
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
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups
otpSchema.index({ phoneNumber: 1, otp: 1 });

const OTP = mongoose.model("OTP", otpSchema);

module.exports = OTP;
