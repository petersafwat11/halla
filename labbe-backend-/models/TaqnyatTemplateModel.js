/**
 * TaqnyatTemplateModel — Phase 4c W0-MODEL
 *
 * Backend cache for the Taqnyat WhatsApp templates list. The previous
 * flow had StepFour on web hit `GET /messaging/approved-templates`,
 * which is a thin passthrough to Taqnyat's `/templates/` endpoint. That
 * has three problems:
 *   1. No backend canonical record we can attach a category / var-mapping
 *      to. Hosts can't pick "wedding" templates without admin-side
 *      curation.
 *   2. Every host wizard load hits Taqnyat live, which means rate-limit
 *      and latency exposure.
 *   3. There's no way to prefer one template over another via sort
 *      order, or to soft-deactivate a template that's still APPROVED on
 *      Meta but unwanted in our UI.
 *
 * This model holds the synced list. The daily cron + admin "Sync" button
 * upsert per `taqnyatId` (Meta-level template identifier). Admins assign
 * `category` + `varMapping[]` (one entry per `{{N}}` slot in the body).
 *
 * @module models/TaqnyatTemplateModel
 */

const mongoose = require("mongoose");

/**
 * Per-`{{N}}` mapping from a Taqnyat template body slot to an event-data
 * source key. The source key is a dotted-path resolved at send time
 * against the Event document (see `messaging.service._getEventBodyParams`
 * dynamic resolution).
 *
 * Phase 4c canonical source keys (extend in Phase 5 as new fields land):
 *   - guest.name                 → guest's name (filled at per-send time)
 *   - eventDetails.title         → event title
 *   - eventDetails.dateFormatted → Riyadh-localized date string
 *   - eventDetails.time          → "HH:MM:AM" event time
 *   - eventDetails.location.address
 *   - host.name
 *   - hostNote                   → top-level Event.hostNote
 *   - invitationMessage          → top-level Event.invitationMessage
 */
const varMappingSchema = new mongoose.Schema(
  {
    placeholder: { type: String, required: true }, // e.g. "{{1}}"
    sourceKey: { type: String, required: true },   // e.g. "guest.name"
    fallback: { type: String, default: "" },        // used when sourceKey resolves to falsy
  },
  { _id: false }
);

const taqnyatTemplateSchema = new mongoose.Schema(
  {
    /** Meta-level template id from Taqnyat `/templates/` */
    taqnyatId: { type: String, required: true, index: true },

    /** Template name as registered on Meta (immutable per Meta) */
    templateName: { type: String, required: true, index: true },

    /** ar / en (Meta language code) */
    language: { type: String, default: "ar" },

    /** APPROVED / PENDING / REJECTED — we sync but only list APPROVED to hosts */
    status: { type: String, default: "APPROVED" },

    /** Meta category (e.g. UTILITY, MARKETING) */
    metaCategory: { type: String },

    /**
     * Halla-side category, set by admin via Assign dialog. Drives the
     * filtered host StepFour view per D4c-1 (Taqnyat picker filters by
     * the visual-template category chosen in step 3).
     *
     * Expected values mirror TemplateCategory codes (e.g. "wedding",
     * "engagement", "birthday"). Empty/null = "uncategorized" — won't
     * surface to hosts until admin assigns.
     */
    category: { type: String, index: true, default: null },

    /** Body preview text from Meta — used in admin Assign dialog for context */
    bodyText: { type: String, default: "" },

    /** True if Meta template definition includes an IMAGE header component */
    hasImageHeader: { type: Boolean, default: false },

    /**
     * Per-`{{N}}` mapping. Empty means use legacy 5-param fallback at
     * send time (see W0-DYNAMIC). Length should match the number of
     * `{{N}}` placeholders in `bodyText`; admin curates this in the
     * Assign dialog.
     */
    varMapping: { type: [varMappingSchema], default: [] },

    /** Soft-disable in our UI without removing from Meta */
    active: { type: Boolean, default: true, index: true },

    /** Last successful sync from Meta */
    lastSyncedAt: { type: Date, default: null },

    /** Sort order in admin/host lists (asc; ties broken by createdAt desc) */
    sortOrder: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

taqnyatTemplateSchema.index({ taqnyatId: 1 }, { unique: true });
taqnyatTemplateSchema.index({ category: 1, active: 1, status: 1 });
taqnyatTemplateSchema.index({ sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("TaqnyatTemplate", taqnyatTemplateSchema);
