/**
 * unifyTemplateInputs.js — consistency pass over every seeded template.
 *
 * After eyeballing the field schemas across the 6 wave-1 + 14 wave-2
 * templates, the keys had drifted: weddingDate vs partyDate vs eventDate,
 * hisName/herName vs brideName/groomName, guestMessage vs invitationMessage,
 * groomFamilyName lingering in cards that should use a personal name.
 *
 * This script idempotently renames keys + aligns limits + aligns category-
 * level message defaults, while preserving every overlay's existing
 * position (topPct/leftPct/widthPct/fontSizeVh/etc.). Decorations are
 * untouched (they don't reference field keys).
 *
 * Conventions enforced:
 *   eventDate       — every date-of-event field (was weddingDate, partyDate, engagementDate)
 *   eventTime       — every time-of-event field (was weddingTime, partyTime, engagementTime)
 *   venue           — already consistent
 *   invitationMessage — every long-form host-to-guest message (was guestMessage)
 *   groomName / brideName — drop family-name variants in favour of personal names
 *   eventTitle      — was conferenceTitle
 *   primaryColor / fontFamily — already consistent
 *
 * Per-category default invitationMessage is set on the field's defaultValue
 * so any wedding template's "default" is the same line — host can edit.
 *
 * Per-key shared limits (weight, age, invitationMessage) are also locked
 * to the same numbers everywhere they appear.
 *
 * Idempotency: re-running is a no-op. Renames check the source key
 * exists; overrides only set fields that differ. expectedVersion is read
 * fresh from the DB doc.
 *
 * Usage:
 *   node scripts/unifyTemplateInputs.js              # apply
 *   node scripts/unifyTemplateInputs.js --dry-run    # report only
 *   node scripts/unifyTemplateInputs.js --verbose
 */

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const mongoose = require("mongoose");
const Template = require("../models/TemplateModel");
const User = require("../models/UserModel");
const service = require("../src/modules/templates/templates.service");

const DRY = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// ── per-category default invitationMessage (one line shared across every
// template in the category — host can override per-event) ──────────────────
const CATEGORY_DEFAULT_MESSAGE = {
  wedding:      "يتشرف بدعوتكم لحضور حفل زفافه",
  engagement:   "يتشرفان بدعوتكم لحضور حفل خطوبتهما",
  birthday:     "يسعدنا حضوركم لمشاركتنا الفرحة",
  baby_shower:  "أهلاً وسهلاً بضيف الحياة الجديد",
  ladies_event: "يسرّني أن تكنّ بصحبتي",
  general_event:"يسعدنا حضوركم في هذه المناسبة",
  conference:   "نتشرف بدعوتكم لحضور المؤتمر",
};

// ── shared limits / props for keys that appear in many templates ────────────
// Locations differ per image, but limits/types must agree wherever a key
// appears. These overrides are applied to each matching field on every
// template in addition to per-template overrides below.
const SHARED_FIELD_OVERRIDES = {
  invitationMessage: { type: "textarea", rows: 3, maxLength: 240 },
  venue:             { type: "text",     maxLength: 80 },
  weight:            { type: "number",   min: 0.5, max: 10, step: 0.01 },
  age:               { type: "number",   min: 1,   max: 120 },
};

// ── per-template patches ────────────────────────────────────────────────────
// Each patch describes:
//   renames: { oldKey: newKey } — applied to fields[] (key) and overlays[] (fieldKey)
//   drop:    [keys] — fields & overlays referencing these keys are removed
//   fieldOverrides: { key: { ...partial field props to merge } }
//
// fieldOverrides gets merged onto the existing field; SHARED_FIELD_OVERRIDES
// is merged after. invitationMessage's default is auto-set to the category
// default unless overridden explicitly.

const TEMPLATE_PATCHES = [
  // ─── WEDDING ──────────────────────────────────────────────────────────────
  {
    nameEn: "Royal Wedding",
    category: "wedding",
    renames: {
      groomFamilyName: "groomName",
      brideFamilyName: "brideName",
    },
    fieldOverrides: {
      groomName: { labelEn: "Groom Name", labelAr: "اسم العريس", placeholderEn: "e.g. Khalid", placeholderAr: "مثل خالد", required: true },
      brideName: { labelEn: "Bride Name", labelAr: "اسم العروس", placeholderEn: "e.g. Sara",   placeholderAr: "مثل سارة", required: true },
    },
  },
  {
    nameEn: "Garden Wedding",
    category: "wedding",
    renames: {
      weddingDate: "eventDate",
      weddingTime: "eventTime",
      guestMessage: "invitationMessage",
    },
    drop: ["address", "rsvpDate", "hashtag"], // already overlay-less; remove from form too
  },
  {
    nameEn: "Royal Navy Wedding",
    category: "wedding",
    // BIG centerpiece was groomFamilyName — rename to groomName. Existing
    // optional groomName (small placeholder text) is dropped to avoid a
    // duplicate key. No brideName synthesised — these are groom-side cards.
    drop: ["groomName"],
    renames: { groomFamilyName: "groomName" },
    fieldOverrides: {
      groomName: { labelEn: "Groom Name", labelAr: "اسم العريس", placeholderEn: "e.g. Khalid Al-Saud", placeholderAr: "مثل خالد آل سعود", required: true },
    },
  },
  {
    nameEn: "Pearl Frame Wedding",
    category: "wedding",
    drop: ["groomName"],
    renames: { groomFamilyName: "groomName" },
    fieldOverrides: {
      groomName: { labelEn: "Groom Name", labelAr: "اسم العريس", placeholderEn: "e.g. Khalid Al-Saud", placeholderAr: "مثل خالد آل سعود", required: true },
    },
  },
  {
    nameEn: "Royal Da'wah Wedding",
    category: "wedding",
    drop: ["groomName"],
    renames: { groomFamilyName: "groomName" },
    fieldOverrides: {
      groomName: { labelEn: "Groom Name", labelAr: "اسم العريس", placeholderEn: "e.g. Khalid Al-Saud", placeholderAr: "مثل خالد آل سعود", required: true },
    },
  },
  {
    nameEn: "Pearl Da'wah Wedding",
    category: "wedding",
    drop: ["groomName"],
    renames: { groomFamilyName: "groomName" },
    fieldOverrides: {
      groomName: { labelEn: "Groom Name", labelAr: "اسم العريس", placeholderEn: "e.g. Khalid Al-Saud", placeholderAr: "مثل خالد آل سعود", required: true },
    },
  },
  {
    nameEn: "Gulf Groom",
    category: "wedding",
    drop: ["groomName"], // was an optional secondary; centerpiece becomes groomName
    renames: { groomFamilyName: "groomName" },
    fieldOverrides: {
      groomName: { labelEn: "Groom Name", labelAr: "اسم العريس", placeholderEn: "e.g. Khalid Al-Zahrani", placeholderAr: "مثل خالد الزهراني", required: true },
    },
  },
  {
    nameEn: "Sacred Vows",
    category: "wedding",
    // Already uses groomName / brideName / eventDate / eventTime / venue.
    // openingVerse + brideFatherName are template-unique — keep as-is.
  },
  {
    nameEn: "Bronze Bloom Vows",
    category: "wedding",
    // Same — already aligned.
  },

  // ─── ENGAGEMENT ───────────────────────────────────────────────────────────
  {
    nameEn: "Pure Promise",
    category: "engagement",
    renames: {
      hisName: "groomName",
      herName: "brideName",
      engagementDate: "eventDate",
      engagementTime: "eventTime",
    },
    fieldOverrides: {
      groomName: { labelEn: "Groom Name", labelAr: "اسم العريس", required: true },
      brideName: { labelEn: "Bride Name", labelAr: "اسم العروس", required: true },
    },
  },
  {
    nameEn: "Pearl Promise",
    category: "engagement",
    drop: ["brideFamilyName"], // family name removed per unification
    renames: {
      engagementDate: "eventDate",
      engagementTime: "eventTime",
    },
  },

  // ─── BIRTHDAY ─────────────────────────────────────────────────────────────
  {
    nameEn: "Sweet Celebration",
    category: "birthday",
    renames: {
      partyDate: "eventDate",
      partyTime: "eventTime",
      guestMessage: "invitationMessage",
    },
    drop: ["theme"], // dropped from overlays in updateTemplateLayouts; clear the form too
  },

  // ─── BABY SHOWER ──────────────────────────────────────────────────────────
  {
    nameEn: "Blessed Newborn",
    category: "baby_shower",
    renames: { guestMessage: "invitationMessage" },
  },
  {
    nameEn: "Little Prince",
    category: "baby_shower",
    renames: { guestMessage: "invitationMessage" },
  },
  {
    nameEn: "Little Princess",
    category: "baby_shower",
    renames: { guestMessage: "invitationMessage" },
  },

  // ─── LADIES' EVENT ────────────────────────────────────────────────────────
  {
    nameEn: "Ladies' Gathering",
    category: "ladies_event",
    renames: { guestMessage: "invitationMessage" },
    drop: ["address", "dressCode"], // overlay-less; remove from form per "no orphan inputs"
  },

  // ─── GENERAL EVENT ────────────────────────────────────────────────────────
  {
    nameEn: "Spring Meadow",
    category: "general_event",
    renames: { guestMessage: "invitationMessage" },
  },
  {
    nameEn: "Lantern Night",
    category: "general_event",
    renames: { guestMessage: "invitationMessage" },
  },
  {
    nameEn: "Sacred Pilgrimage",
    category: "general_event",
    // pilgrimName + announcement are template-unique. eventDate/eventTime
    // already use unified keys. No invitationMessage exists — leave as is.
  },

  // ─── CONFERENCE ───────────────────────────────────────────────────────────
  {
    nameEn: "Visionary Conference",
    category: "conference",
    renames: {
      conferenceTitle: "eventTitle",
      guestMessage:    "invitationMessage",
    },
    fieldOverrides: {
      eventTitle: { labelEn: "Event Title", labelAr: "عنوان المؤتمر" },
    },
  },
];

// ── transform helpers ───────────────────────────────────────────────────────

/**
 * Apply rename + drop to a fields[] array. Idempotent: if a rename's source
 * is already absent (target already exists), the rename is a no-op.
 * Returns { fields, changed, ops } where `ops` is a human-readable summary.
 */
function transformFields(originalFields, patch, defaultMessage) {
  const ops = [];
  const renames = patch.renames || {};
  const drops = new Set(patch.drop || []);
  const overrides = patch.fieldOverrides || {};

  // Step 1: drop
  let fields = originalFields
    .map((f) => f.toObject ? f.toObject() : { ...f })
    .filter((f) => {
      if (drops.has(f.key)) {
        ops.push(`drop field "${f.key}"`);
        return false;
      }
      return true;
    });

  // Step 2: rename — but only if source exists AND target doesn't
  for (const [oldKey, newKey] of Object.entries(renames)) {
    const src = fields.find((f) => f.key === oldKey);
    if (!src) {
      // already renamed in a prior run, or never existed
      continue;
    }
    const dup = fields.find((f) => f.key === newKey && f !== src);
    if (dup) {
      // target key already exists too — drop the source to avoid duplicate.
      // This can happen if the previous run renamed but a stale field
      // remained for some reason.
      fields = fields.filter((f) => f !== src);
      ops.push(`rename collision: dropped "${oldKey}" (target "${newKey}" already present)`);
      continue;
    }
    src.key = newKey;
    ops.push(`rename "${oldKey}" → "${newKey}"`);
  }

  // Step 3: per-key overrides (template-specific)
  for (const f of fields) {
    if (overrides[f.key]) {
      const before = JSON.stringify(pickProps(f, overrides[f.key]));
      Object.assign(f, overrides[f.key]);
      const after = JSON.stringify(pickProps(f, overrides[f.key]));
      if (before !== after) ops.push(`override "${f.key}" props`);
    }
  }

  // Step 4: shared cross-template limits
  for (const f of fields) {
    const shared = SHARED_FIELD_OVERRIDES[f.key];
    if (!shared) continue;
    let touched = false;
    for (const [k, v] of Object.entries(shared)) {
      if (f[k] !== v) {
        f[k] = v;
        touched = true;
      }
    }
    if (touched) ops.push(`shared-limits "${f.key}"`);
  }

  // Step 5: category-default invitationMessage (only if the field exists)
  if (defaultMessage) {
    const msg = fields.find((f) => f.key === "invitationMessage");
    if (msg && msg.defaultValue !== defaultMessage) {
      msg.defaultValue = defaultMessage;
      ops.push(`set invitationMessage default to category line`);
    }
  }

  return { fields, ops };
}

function pickProps(obj, ref) {
  const out = {};
  for (const k of Object.keys(ref)) out[k] = obj[k];
  return out;
}

/**
 * Apply rename + drop to overlays[]. Drops run BEFORE renames so a card
 * like Royal Navy Wedding (which originally has BOTH groomFamilyName and
 * groomName overlays) ends up with the family-name overlay successfully
 * renamed to "groomName" without colliding with the dropped secondary one.
 * Preserves every other property (positions, font sizes, colours).
 */
function transformOverlays(originalOverlays, patch) {
  const ops = [];
  const renames = patch.renames || {};
  const drops = new Set(patch.drop || []);

  const out = [];
  for (const o of originalOverlays) {
    const obj = o.toObject ? o.toObject() : { ...o };
    if (drops.has(obj.fieldKey)) {
      ops.push(`drop overlay "${obj.fieldKey}"`);
      continue;
    }
    if (renames[obj.fieldKey]) {
      ops.push(`rename overlay "${obj.fieldKey}" → "${renames[obj.fieldKey]}"`);
      obj.fieldKey = renames[obj.fieldKey];
    }
    out.push(obj);
  }
  return { overlays: out, ops };
}

// ── DB connect ──────────────────────────────────────────────────────────────
async function connect() {
  let DB = process.env.DATABASE;
  if (process.env.DATABASE_PASSWORD && DB.includes("<PASSWORD>")) {
    DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
  }
  const opts = {};
  if (process.env.DATABASE_CERT_PATH) {
    opts.tls = true;
    opts.tlsCertificateKeyFile = process.env.DATABASE_CERT_PATH;
  }
  await mongoose.connect(DB, opts);
  console.log(`[unify] mongo connected: ${mongoose.connection.host}`);
}

async function applyPatch(patch, actor) {
  const doc = await Template.findOne({ nameEn: patch.nameEn, deletedAt: null });
  if (!doc) {
    console.warn(`[unify] "${patch.nameEn}" not found — skipping`);
    return { skipped: true };
  }

  const defaultMessage = CATEGORY_DEFAULT_MESSAGE[patch.category];
  const { fields: newFields, ops: fieldOps } = transformFields(doc.fields, patch, defaultMessage);
  const { overlays: newOverlays, ops: overlayOps } = transformOverlays(doc.overlays, patch);
  const allOps = [...fieldOps, ...overlayOps];

  // Sanity: every overlay's fieldKey must exist in newFields[]
  const fieldKeys = new Set(newFields.map((f) => f.key));
  const orphans = newOverlays.filter((o) => !fieldKeys.has(o.fieldKey));
  if (orphans.length) {
    console.error(
      `[unify] !! "${patch.nameEn}" — overlays reference missing keys: ${orphans.map((o) => o.fieldKey).join(", ")}`
    );
    return { error: true };
  }

  if (allOps.length === 0) {
    if (VERBOSE) console.log(`[unify] "${patch.nameEn}": already unified — no-op`);
    return { unchanged: true };
  }

  if (DRY) {
    console.log(`[dry] "${patch.nameEn}" (v${doc.version}): ${allOps.join("; ")}`);
    if (VERBOSE) {
      console.log(`       fields:   ${doc.fields.map((f) => f.key).join(", ")}`);
      console.log(`         →       ${newFields.map((f) => f.key).join(", ")}`);
      console.log(`       overlays: ${doc.overlays.map((o) => o.fieldKey).join(", ")}`);
      console.log(`         →       ${newOverlays.map((o) => o.fieldKey).join(", ")}`);
    }
    return { dry: true };
  }

  const updated = await service.updateTemplate(
    String(doc._id),
    {
      fields: newFields,
      overlays: newOverlays,
      expectedVersion: doc.version || 0,
    },
    actor
  );
  console.log(
    `[unify] "${patch.nameEn}" (v${doc.version} → v${updated.version}): ${allOps.join("; ")}`
  );
  return { updated: true };
}

async function verify() {
  console.log("\n[unify] verification — field key inventory per category:");
  const docs = await Template.find({ deletedAt: null, active: true })
    .sort({ categories: 1, sortOrder: 1 })
    .lean();

  const byCat = new Map();
  for (const d of docs) {
    for (const c of d.categories) {
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c).push(d);
    }
  }
  for (const [cat, list] of byCat) {
    console.log(`\n  category: ${cat}`);
    for (const d of list) {
      const keys = d.fields.map((f) => f.key).join(", ");
      console.log(`    - ${d.nameEn.padEnd(28)} : ${keys}`);
    }
  }

  // Cross-template invariants for keys that should be globally consistent
  const offendingKeys = ["weddingDate", "weddingTime", "partyDate", "partyTime", "engagementDate", "engagementTime", "guestMessage", "hisName", "herName", "groomFamilyName", "brideFamilyName", "conferenceTitle"];
  const stillThere = [];
  for (const d of docs) {
    for (const f of d.fields) {
      if (offendingKeys.includes(f.key)) {
        stillThere.push(`${d.nameEn} → ${f.key}`);
      }
    }
  }
  if (stillThere.length) {
    console.error("\n  !! legacy keys still in DB:");
    for (const s of stillThere) console.error(`     - ${s}`);
  } else {
    console.log("\n  ✓ no legacy keys remaining");
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[unify] mode: ${DRY ? "DRY-RUN" : "APPLY"}`);
  if (!process.env.DATABASE) {
    console.error("[unify] DATABASE env required");
    process.exit(1);
  }
  await connect();

  const actor = await User.findOne({ email: "test.superadmin@labbe.sa" }).lean();
  if (!actor) {
    console.error("[unify] super-admin 'test.superadmin@labbe.sa' not found");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`[unify] actor: ${actor.email}`);

  let updated = 0, unchanged = 0, skipped = 0, errored = 0, dry = 0;
  for (const patch of TEMPLATE_PATCHES) {
    try {
      const r = await applyPatch(patch, actor);
      if (r.updated) updated++;
      else if (r.unchanged) unchanged++;
      else if (r.skipped) skipped++;
      else if (r.error) errored++;
      else if (r.dry) dry++;
    } catch (err) {
      errored++;
      console.error(`[unify] FAILED on "${patch.nameEn}":`, err.message);
    }
  }
  console.log(
    `\n[unify] summary: updated=${updated} unchanged=${unchanged} skipped=${skipped} errored=${errored} dry=${dry}`
  );

  await verify();
  await mongoose.disconnect();
  console.log("[unify] done.");
}

main().catch((err) => {
  console.error("[unify] FAILED:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
