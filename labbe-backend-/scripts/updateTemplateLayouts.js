/**
 * updateTemplateLayouts.js — visual-polish pass after seedTemplateCards.js.
 *
 * After eyeballing each template in the editor preview, four needed
 * tweaks. This script PUTs the corrected `overlays` and (where
 * applicable) `decorations`/`fields` arrays via service.updateTemplate.
 *
 * Templates left untouched on purpose: Pure Promise, Blessed Newborn —
 * already look great, no regression risk worth taking.
 *
 * Usage:
 *   node scripts/updateTemplateLayouts.js              # apply
 *   node scripts/updateTemplateLayouts.js --dry-run    # report only
 */

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "config.env") });

const mongoose = require("mongoose");
const Template = require("../models/TemplateModel");
const User = require("../models/UserModel");
const service = require("../src/modules/templates/templates.service");

const DRY = process.argv.includes("--dry-run");

const ov = (fieldKey, topPct, leftPct, widthPct, fontSizeVh, fontWeight, opts = {}) => ({
  fieldKey,
  topPct,
  leftPct,
  widthPct,
  fontSizeVh,
  fontWeight,
  textAlign: "center",
  colorBinding: opts.colorBinding || "primary",
  ...(opts.color !== undefined ? { color: opts.color } : {}),
  ...(opts.fontFamily !== undefined ? { fontFamily: opts.fontFamily } : {}),
  zIndex: opts.zIndex ?? 1,
});

const dec = (source, color, topPct, leftPct, widthPct, iconSizeVh, zIndex = 1) => ({
  type: "icon",
  source,
  color,
  topPct,
  leftPct,
  widthPct,
  iconSizeVh,
  zIndex,
});

// ─────────────────────────────────────────────────────────────────────────────
// 1) Royal Wedding — keep cream-gold custom colour. Drop the redundant
//    Sparkles at (47,50) that stacked behind the Crown. Crown alone is the
//    focal point.
// ─────────────────────────────────────────────────────────────────────────────
const ROYAL = {
  nameEn: "Royal Wedding",
  patch: {
    overlays: [
      ov("groomFamilyName",   52, 50, 70, 5.5, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("brideFamilyName",   62, 50, 70, 5.5, "700", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventDate",         75, 50, 60, 3.2, "500", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("eventTime",         80, 50, 60, 3.0, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("venue",             86, 50, 80, 2.8, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
      ov("invitationMessage", 92, 50, 80, 2.4, "400", { colorBinding: "custom", color: "#e8d3a0", fontFamily: "'Amiri', serif" }),
    ],
    decorations: [
      dec("Crown", "#e8d3a0", 41, 50, 8, 4.5),
      // Sparkle pair flanking the Crown for symmetry
      dec("Sparkle", "#e8d3a0", 43, 35, 4, 2.0),
      dec("Sparkle", "#e8d3a0", 43, 65, 4, 2.0),
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) Garden Wedding — round 2: 11 overlays in 22-70% piled into each
//    other and into the gazebo. Drop the three OPTIONAL overlays
//    (address, rsvpDate, hashtag) — they remain in fields[] so the host
//    can still fill them in the form, they just don't paint on the
//    canvas. Card stays focused on names + when/where.
// ─────────────────────────────────────────────────────────────────────────────
const GARDEN = {
  nameEn: "Garden Wedding",
  patch: {
    overlays: [
      ov("guestMessage", 22, 50, 70, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("brideName",    30, 50, 60, 5.0, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("groomName",    41, 50, 60, 5.0, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("weddingDate",  53, 50, 60, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("weddingTime",  59, 50, 60, 2.8, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",        65, 50, 75, 2.6, "500", { fontFamily: "'Cairo', sans-serif" }),
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3) Birthday — round 2: `theme` overlay piled onto `venue`. Drop the
//    optional `theme` overlay (still a form field). Keep the rest.
// ─────────────────────────────────────────────────────────────────────────────
const BIRTHDAY = {
  nameEn: "Sweet Celebration",
  patch: {
    overlays: [
      ov("guestMessage",  27, 50, 70, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("celebrantName", 36, 50, 70, 5.5, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("age",           47, 50, 30, 7.0, "800", { fontFamily: "'Cairo', sans-serif" }),
      ov("partyDate",     56, 50, 60, 3.0, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("partyTime",     61, 50, 60, 2.8, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",         66, 50, 75, 2.8, "500", { fontFamily: "'Cairo', sans-serif" }),
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4) Ladies' Gathering — MAJOR rework. The seed plan §5 said peonies were
//    70-100%; the actual image has leaves coming in ~45% and dense
//    florals from ~55%. So:
//      - drop `address` + `dressCode` overlays from the canvas (still
//        appear as form fields → host can fill them, just not painted on
//        the card).
//      - pack remaining 6 overlays into 8-46%.
//      - move Flower2 decorations down to ~50% to crown the floral
//        border instead of floating in the empty top.
// ─────────────────────────────────────────────────────────────────────────────
const LADIES = {
  nameEn: "Ladies' Gathering",
  patch: {
    overlays: [
      ov("guestMessage", 10, 50, 70, 2.4, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventTitle",   18, 50, 70, 5.0, "700", { fontFamily: "'Cairo', sans-serif" }),
      ov("hostessName",  28, 50, 70, 3.2, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventDate",    36, 50, 60, 2.8, "500", { fontFamily: "'Cairo', sans-serif" }),
      ov("eventTime",    41, 50, 60, 2.6, "400", { fontFamily: "'Cairo', sans-serif" }),
      ov("venue",        46, 50, 70, 2.4, "500", { fontFamily: "'Cairo', sans-serif" }),
    ],
    decorations: [
      // Sparkle just under the title — visual divider above hostess
      dec("Sparkle", "#8b2243", 24, 50, 4, 2.0),
      // Flower2 pair set lower to "crown" the peony border instead of
      // floating untethered in the empty top third.
      dec("Flower2", "#8b2243", 51, 18, 5, 3.0),
      dec("Flower2", "#8b2243", 51, 82, 5, 3.0),
    ],
  },
};

const PATCHES = [ROYAL, GARDEN, BIRTHDAY, LADIES];

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
}

async function main() {
  console.log(`[update] mode: ${DRY ? "DRY-RUN" : "APPLY"}`);
  await connect();

  const actor = await User.findOne({ email: "test.superadmin@labbe.sa" }).lean();
  if (!actor) {
    console.error("[update] super-admin not found");
    process.exit(1);
  }

  for (const { nameEn, patch } of PATCHES) {
    const doc = await Template.findOne({ nameEn, deletedAt: null });
    if (!doc) {
      console.warn(`[update] template "${nameEn}" not found — skipping`);
      continue;
    }
    const overlayCount = patch.overlays?.length ?? doc.overlays.length;
    const decoCount = patch.decorations?.length ?? doc.decorations.length;
    if (DRY) {
      console.log(
        `[dry] would update "${nameEn}" (${doc._id}) — overlays=${overlayCount} deco=${decoCount}`
      );
      continue;
    }
    const updated = await service.updateTemplate(String(doc._id), patch, actor);
    console.log(
      `[update] "${nameEn}" (${updated._id}) — overlays=${updated.overlays.length} deco=${updated.decorations.length} version=${updated.version}`
    );
  }

  await mongoose.disconnect();
  console.log("[update] done.");
}

main().catch((err) => {
  console.error("[update] FAILED:", err);
  mongoose.disconnect().finally(() => process.exit(1));
});
