/**
 * Local cache of Taqnyat WhatsApp templates. The host wizard reads from
 * here instead of hitting Taqnyat live; admins curate `category` +
 * `varMapping[]` (one entry per `{{N}}` slot in the body) so the wizard
 * can filter the catalogue and the messaging service can resolve
 * placeholders against event data.
 *
 * @module models/TaqnyatTemplateModel
 */

const mongoose = require("mongoose");

/**
 * Per-`{{N}}` mapping from a Taqnyat template body slot to an event-data
 * source key. The source key is a dotted-path resolved at send time
 * against the Event document (see `messaging.service._getEventBodyParams`).
 *
 * Canonical source keys: `guest.name`, `eventDetails.title`,
 * `eventDetails.dateFormatted`, `eventDetails.time`,
 * `eventDetails.location.address`, `host.name`.
 */
const varMappingSchema = new mongoose.Schema(
  {
    placeholder: { type: String, required: true }, // e.g. "{{1}}"
    sourceKey: { type: String, required: true },   // e.g. "guest.name"
    fallback: { type: String, default: "" },        // used when sourceKey resolves to falsy
  },
  { _id: false }
);

const templateButtonSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    text: { type: String, default: "" },
    url: { type: String, default: "" },
    index: { type: Number, required: true },
  },
  { _id: false }
);

const taqnyatTemplateSchema = new mongoose.Schema(
  {
    /** Meta-level template id from Taqnyat `/templates/`. Unique index declared below. */
    taqnyatId: { type: String, required: true },

    /** Template name as registered on Meta (immutable per Meta) */
    templateName: { type: String, required: true, index: true },

    /** ar / en (Meta language code) */
    language: { type: String, default: "ar" },

    /** APPROVED / PENDING / REJECTED — we sync but only list APPROVED to hosts */
    status: { type: String, default: "APPROVED" },

    /** Meta category (e.g. UTILITY, MARKETING) */
    metaCategory: { type: String },

    /**
     * Halaa-side category, set by admin via the Assign dialog. Drives the
     * host wizard's filtered list (category locked in step 3 → this
     * filter). Mirrors TemplateCategory codes (e.g. "wedding"). Null =
     * uncategorized → hidden from hosts until admin assigns.
     */
    category: { type: String, index: true, default: null },

    /**
     * Template purpose within a category. Drives the cron + create-event picker:
     *  - 'invite' → many allowed per (category); host picks one in step 4
     *  - 'reminder_confirmed' → exactly one active per category; auto-reminder cron
     *                          + pool-charged extra reminder use it (confirmed guests)
     *  - 'post_event' → one active per category; post-event messaging
     *  - 'staff_access' → one active GLOBAL (category may be null); staff notify
     *
     * Uniqueness for non-`invite` types is enforced at the service layer in
     * `taqnyat-templates.service.assignMapping` (atomic deactivate-then-flip).
     * No partial-unique DB index — `$in` is unsupported by partial filters and
     * four separate indexes add cost without real safety beyond the atomic write.
     */
    type: {
      type: String,
      enum: ['invite', 'reminder_confirmed', 'post_event', 'staff_access'],
      default: null,
      index: true,
    },

    /**
     * The invitation journey this approved invite template is assigned to.
     * Kept separate from `type`, which describes template purpose. Legacy
     * invite rows with null mode are treated as `reply_and_qr` until an admin
     * explicitly re-saves them.
     */
    invitationMode: {
      type: String,
      enum: ['reply_and_qr', 'reply_only', 'none'],
      default: null,
      index: true,
    },

    /** Normalized controls synced from Meta/Taqnyat's BUTTONS component. */
    buttons: { type: [templateButtonSchema], default: [] },

    /** Distinguishes a verified no-button template from a pre-feature row. */
    buttonsSynced: { type: Boolean, default: false },

    /** Body preview text from Meta — used in admin Assign dialog for context */
    bodyText: { type: String, default: "" },

    /** True if Meta template definition includes an IMAGE header component */
    hasImageHeader: { type: Boolean, default: false },

    /**
     * Per-`{{N}}` mapping. Empty means use the legacy 5-param fallback
     * at send time. Length should match the number of `{{N}}` placeholders
     * in `bodyText`; admin curates this in the Assign dialog.
     */
    varMapping: { type: [varMappingSchema], default: [] },

    /** Soft-disable in our UI without removing from Meta */
    active: { type: Boolean, default: true, index: true },

    /**
     * True when the last sync did not return this taqnyatId from upstream.
     * Kept orthogonal from `active` so admin intent and upstream
     * availability don't fight each other; the host filter excludes any
     * row with this flag set. Reset to false on the next sync that sees it.
     */
    removedFromMeta: { type: Boolean, default: false, index: true },

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
taqnyatTemplateSchema.index({ category: 1, type: 1, active: 1, status: 1 });
taqnyatTemplateSchema.index({ category: 1, type: 1, invitationMode: 1, active: 1, status: 1 });
taqnyatTemplateSchema.index({ type: 1, active: 1, status: 1 });
taqnyatTemplateSchema.index({ sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("TaqnyatTemplate", taqnyatTemplateSchema);
