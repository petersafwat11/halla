/**
 * Visual invitation card template — admin-editable, host-selectable.
 * Overlay positions are stored as percentages of natural image
 * dimensions (never pixels) so the same template renders correctly
 * across thumbnail, preview, and final-bake sizes.
 */

const mongoose = require("mongoose");

const fieldDefSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "textarea", "date", "time", "color", "font", "number", "email", "password"],
      required: true,
    },
    labelEn: { type: String, required: true },
    labelAr: { type: String, required: true },
    placeholderEn: { type: String },
    placeholderAr: { type: String },
    required: { type: Boolean, default: false },
    minLength: { type: Number },
    maxLength: { type: Number },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    rows: { type: Number, default: 3 },
    inputMode: {
      type: String,
      enum: ["text", "numeric", "decimal", "tel", "email", "url"],
    },
    autoCapitalize: {
      type: String,
      enum: ["none", "sentences", "words", "characters"],
    },
    dir: { type: String, enum: ["auto", "ltr", "rtl"], default: "auto" },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
  },
  { _id: false }
);

const overlaySchema = new mongoose.Schema(
  {
    fieldKey: { type: String, required: true },
    topPct: { type: Number, required: true, min: 0, max: 100 },
    leftPct: { type: Number, required: true, min: 0, max: 100 },
    widthPct: { type: Number, min: 0, max: 100 },
    fontSizeVh: { type: Number, min: 0 },
    fontWeight: {
      type: String,
      enum: ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
      default: "normal",
    },
    textAlign: { type: String, enum: ["left", "center", "right"], default: "center" },
    colorBinding: { type: String, enum: ["primary", "custom"], default: "primary" },
    color: {
      type: String,
      validate: {
        validator: (v) => !v || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v),
        message: "color must be a valid hex string",
      },
    },
    fontFamily: { type: String },
    zIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

const decorationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["icon", "image"], required: true },
    source: { type: String, required: true },
    color: { type: String },
    topPct: { type: Number, required: true, min: 0, max: 100 },
    leftPct: { type: Number, required: true, min: 0, max: 100 },
    widthPct: { type: Number, required: true, min: 0, max: 100 },
    iconSizeVh: { type: Number, min: 0 },
    zIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true },
    nameAr: { type: String, required: true },
    categories: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one category is required",
      },
    },
    imageUrl: { type: String, required: true },
    imageS3Key: { type: String, required: true },
    thumbnailUrl: { type: String },
    thumbnailS3Key: { type: String },
    naturalWidth: { type: Number, required: true },
    naturalHeight: { type: Number, required: true },
    fields: { type: [fieldDefSchema], default: [] },
    overlays: { type: [overlaySchema], default: [] },
    decorations: { type: [decorationSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

templateSchema.index({ categories: 1, active: 1, deletedAt: 1 });
templateSchema.index({ nameEn: "text", nameAr: "text" });
templateSchema.index({ sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("Template", templateSchema);
