/**
 * Categories for visual templates. Admin curates; hosts pick a single
 * category in StepThree which then drives the StepFour Taqnyat picker
 * filter via `taqnyat-templates?category=…`.
 */

const mongoose = require("mongoose");

const templateCategorySchema = new mongoose.Schema(
  {
    /** snake_case identifier; immutable after create */
    code: { type: String, required: true, unique: true, index: true },
    nameEn: { type: String, required: true },
    nameAr: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

templateCategorySchema.index({ active: 1, sortOrder: 1 });

module.exports = mongoose.model("TemplateCategory", templateCategorySchema);
