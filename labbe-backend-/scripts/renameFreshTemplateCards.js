/**
 * Rename the freshly-downloaded Arabic template-card filenames to the
 * canonical filenames consumed by seedTemplateCards.js and the live DB.
 *
 * Safety:
 *   - dry-run by default
 *   - validates all 20 source files before changing anything
 *   - refuses to overwrite an existing canonical target
 *   - uses a two-phase source -> temporary -> target rename
 *   - rolls temporary files back if a rename fails
 *
 * Usage (from labbe-backend-):
 *   node scripts/renameFreshTemplateCards.js
 *   node scripts/renameFreshTemplateCards.js --apply
 */

const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const CARDS_DIR = path.resolve(__dirname, "..", "..", "template-cards");

const RENAMES = [
  ["دعوه رجالية زفاف1-0١.jpg", "marriage.jpg"],
  ["دعوه رجالية زفاف1-0٥.jpg", "wedding_white_dawah.jpg"],
  ["دعوه رجالية زفاف1-0٤.jpg", "wedding_navy_dawah.jpg"],
  ["دعوه رجالية زفاف2.jpg", "wedding_gulf_groom.jpg"],
  ["مواليد بنات-0١.jpg", "blessed_births.jpg"],
  ["دعوه نسائية4-0٢.jpg", "woman_invitation.jpg"],
  ["دعوه نسائية4-0٣.jpg", "marriage2.jpg"],
  ["عقد قران-0١.jpg", "engament.jpg"],
  ["عقد قران.jpg", "marriage_contract_arch.jpg"],
  ["مناسبات عامه -0١.jpg", "general_spring.jpg"],
  ["مناسبات عامه -0٢.jpg", "general_lantern.jpg"],
  ["مناسبات عامه 2-0١.jpg", "birthday.jpg"],
  ["بشاره مواليد اولاد.jpg", "newborn_boy.jpg"],
  ["مواليد بنات-0٢.jpg", "newborn_girl.jpg"],
  ["عقد قران-0٢.jpg", "marriage_contract_bronze.jpg"],
  ["دعوه خطوبة نسنائي.jpg", "engagement_pearl.jpg"],
  ["دعوه رجالية زفاف-0٤.jpg", "wedding_navy_frame.jpg"],
  ["دعوه رجالية زفاف-0٥.jpg", "wedding_white_frame.jpg"],
  ["مناسبات عامه 2-0٢.jpg", "general_pilgrimage.jpg"],
  ["مؤتمر.jpg", "conference.jpg"],
];

function fail(messages) {
  for (const message of messages) console.error(`[rename] ERROR: ${message}`);
  process.exitCode = 1;
}

function main() {
  console.log(`[rename] cards directory: ${CARDS_DIR}`);
  console.log(`[rename] mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (!fs.existsSync(CARDS_DIR)) {
    return fail([`directory does not exist: ${CARDS_DIR}`]);
  }

  const errors = [];
  const seenSources = new Set();
  const seenTargets = new Set();

  for (const [sourceName, targetName] of RENAMES) {
    if (seenSources.has(sourceName)) errors.push(`duplicate source mapping: ${sourceName}`);
    if (seenTargets.has(targetName)) errors.push(`duplicate target mapping: ${targetName}`);
    seenSources.add(sourceName);
    seenTargets.add(targetName);

    const source = path.join(CARDS_DIR, sourceName);
    const target = path.join(CARDS_DIR, targetName);
    if (!fs.existsSync(source)) errors.push(`missing source: ${sourceName}`);
    if (fs.existsSync(target)) errors.push(`target already exists (refusing overwrite): ${targetName}`);
  }

  if (errors.length) return fail(errors);

  for (const [sourceName, targetName] of RENAMES) {
    const size = fs.statSync(path.join(CARDS_DIR, sourceName)).size;
    console.log(`[rename] ${sourceName} -> ${targetName} (${size} bytes)`);
  }

  if (!APPLY) {
    console.log("[rename] dry-run complete; no files changed. Re-run with --apply.");
    return;
  }

  const token = `.template-rename-${Date.now()}`;
  const staged = [];

  try {
    for (const [index, [sourceName, targetName]] of RENAMES.entries()) {
      const source = path.join(CARDS_DIR, sourceName);
      const temporary = path.join(CARDS_DIR, `${token}-${index}.tmp`);
      fs.renameSync(source, temporary);
      staged.push({ source, temporary, target: path.join(CARDS_DIR, targetName) });
    }

    for (const item of staged) fs.renameSync(item.temporary, item.target);
  } catch (error) {
    for (const item of [...staged].reverse()) {
      try {
        if (fs.existsSync(item.temporary) && !fs.existsSync(item.source)) {
          fs.renameSync(item.temporary, item.source);
        }
      } catch (_) {
        // Keep reporting the original error; any leftover temp file is obvious
        // from its unique prefix and can be recovered without overwriting data.
      }
    }
    throw error;
  }

  const missingTargets = RENAMES
    .map(([, targetName]) => targetName)
    .filter((targetName) => !fs.existsSync(path.join(CARDS_DIR, targetName)));
  if (missingTargets.length) return fail(missingTargets.map((name) => `target missing after apply: ${name}`));

  console.log(`[rename] complete: ${RENAMES.length} files renamed.`);
}

try {
  main();
} catch (error) {
  console.error("[rename] FAILED:", error.message);
  process.exitCode = 1;
}

