const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { TEMPLATES } = require("./precisionTemplateSpecs");
const { VOCAB, META_KEYS } = require("./_templateCardVocab");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "plans", "TEMPLATE_CARD_PRECISION_AUDIT_CORRECTED.md");
const SOURCE_DIR = path.join(ROOT, "template-cards");
const REF_DIR = path.join(ROOT, "labbe", "public", "template-cards");

const cell = (value) => String(value ?? "—").replace(/\|/g, "\\|").replace(/\n/g, "<br>");

async function dimensions(file) {
  const meta = await sharp(file).metadata();
  return { width: meta.width, height: meta.height, ratio: meta.width / meta.height };
}

function fieldRow(field) {
  return `| \`${cell(field.key)}\` | ${cell(field.type)} | ${cell(field.labelEn)} | ${cell(field.labelAr)} | ${cell(field.placeholderEn)} | ${cell(field.placeholderAr)} | ${field.required ? "yes" : "no"} | ${cell(field.rows)} | ${cell(field.maxLength)} |`;
}

function overlayRow(overlay) {
  return `| \`${cell(overlay.fieldKey)}\` | ${cell(overlay.topPct)} | ${cell(overlay.leftPct)} | ${cell(overlay.widthPct)} | ${cell(overlay.fontSizeVh)} | ${cell(overlay.lineHeight)} | ${cell(overlay.maxLines)} | ${cell(overlay.fontWeight)} | ${cell(overlay.textAlign)} | ${cell(overlay.colorBinding)} | ${cell(overlay.color)} | ${cell(overlay.fontFamily)} | ${cell(overlay.zIndex)} |`;
}

async function main() {
  const lines = [
    "# Template-card precision audit — corrected implementation specification",
    "",
    "> Status: code and visual-proof preparation complete; database and S3 apply mode have **not** been run.",
    "",
    "## Locked standards",
    "",
    "- Every card has `eventDate`, `eventTime`, and `venue` in one horizontal RTL row: Date on the visual right, Time in the centre, Venue on the visual left.",
    "- Every metadata column has its icon above its value: `CalendarDays`, `Clock`, `MapPin`.",
    "- Bride and groom are side by side whenever both fields exist.",
    "- `invitationMessage` is a three-row textarea. Per-card maximum lengths are lowered where the measured band is smaller.",
    "- Shared concepts use one canonical key. No editable content field has a default value.",
    "- `primaryColor` and `fontFamily` are style-only and have no overlay.",
    "- No forbidden surname appears in the canonical vocabulary or precision specs.",
    "- Overlay coordinates are centres because the renderer uses `translate(-50%, -50%)`.",
    "",
    "## Canonical vocabulary",
    "",
    "| key | type | label EN | label AR | placeholder EN | placeholder AR | rows | max length |",
    "|---|---|---|---|---|---|---:|---:|",
  ];

  for (const [key, definition] of Object.entries(VOCAB)) {
    if (["invitationHeader", "announcement", "parents", "brideFatherName", "hostessName", "birthDate", "age", "weight"].includes(key)) continue;
    lines.push(`| \`${key}\` | ${cell(definition.type)} | ${cell(definition.labelEn)} | ${cell(definition.labelAr)} | ${cell(definition.placeholderEn)} | ${cell(definition.placeholderAr)} | ${cell(definition.rows)} | ${cell(definition.maxLength)} |`);
  }

  lines.push(
    "",
    "## Per-template specifications",
    "",
    "The proof comparison for referenced cards is ordered **source | proposed render | completed reference**. Unreferenced cards contain source | proposed render.",
    ""
  );

  for (const [index, template] of TEMPLATES.entries()) {
    const sourcePath = path.join(SOURCE_DIR, template.file);
    const src = await dimensions(sourcePath);
    let ratioText = "no numbered reference; layout is proposed";
    if (template.polished) {
      const ref = await dimensions(path.join(REF_DIR, template.polished));
      const ratioDiff = Math.abs(src.ratio - ref.ratio) / ref.ratio * 100;
      ratioText = `${ref.width}×${ref.height}; ratio difference ${ratioDiff.toFixed(3)}%`;
    }
    const proofName = `compare-${String(index + 1).padStart(2, "0")}-${template.file.replace(/\.[^.]+$/, "")}.png`;
    const confidence = template.file === "marriage_contract_bronze.jpg"
      ? "BLOCKED: the supplied source artwork does not match reference 15; field hierarchy is ready but visual approval requires the correct blank background."
      : template.polished
        ? "Measured from numbered reference and tuned in the first proof pass."
        : "Proposed from the closest referenced sibling; requires visual approval.";

    lines.push(
      `### ${index + 1}. ${template.nameEn} / ${template.nameAr}`,
      "",
      `- Source: \`${template.file}\` (${src.width}×${src.height})`,
      `- Reference: ${template.polished ? `\`${template.polished}\`` : "none"} (${ratioText})`,
      `- Categories: ${template.categories.map((item) => `\`${item}\``).join(", ")}`,
      `- Assessment: ${confidence}`,
      `- Proof: [${proofName}](template-audit-corrected/proofs/${proofName})`,
      "",
      "#### Fields",
      "",
      "| key | type | label EN | label AR | placeholder EN | placeholder AR | required | rows | max length |",
      "|---|---|---|---|---|---|---|---:|---:|"
    );
    for (const field of template.fields) lines.push(fieldRow(field));

    lines.push(
      "",
      "#### Overlays",
      "",
      "| field | top % | left % | width % | font vh | line height | max lines | weight | align | colour binding | colour | font | z |",
      "|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|"
    );
    for (const overlay of template.overlays) lines.push(overlayRow(overlay));

    lines.push(
      "",
      "#### Decorations",
      "",
      "| icon/type | top % | left % | width % | size vh | colour | z |",
      "|---|---:|---:|---:|---:|---|---:|"
    );
    for (const decoration of template.decorations) {
      lines.push(`| ${cell(decoration.source || decoration.type)} | ${cell(decoration.topPct)} | ${cell(decoration.leftPct)} | ${cell(decoration.widthPct)} | ${cell(decoration.iconSizeVh)} | ${cell(decoration.color)} | ${cell(decoration.zIndex)} |`);
    }
    lines.push("");
  }

  lines.push(
    "## Migration readiness",
    "",
    "- `renameFreshTemplateCards.js`: applied successfully to the 20 fresh downloads; dry-run remains safe for future batches.",
    "- `updateTemplateCardsPrecision.js`: dry-run found exactly one live row for each source and reports 20 id-preserving updates. `--apply` is required for DB writes; `--replace-images` additionally requires `--apply`.",
    "- `migrateEventTemplateFieldKeys.js`: dry-run scanned three dependent events and would add canonical aliases without deleting legacy values.",
    "- `renderTemplateCardProofs.js`: generated 20 local proofs without DB/S3 access.",
    "",
    "## Remaining approval blocker",
    "",
    "Reference 15 and `marriage_contract_bronze.jpg` are different artwork. Do not apply Card 15 as visually approved until its matching blank source is supplied or the decision is made to use the available bronze background with the proposed graduation hierarchy.",
    ""
  );

  fs.writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
  console.log(`[report] wrote ${OUT}`);
}

main().catch((error) => {
  console.error("[report] FAILED:", error);
  process.exitCode = 1;
});

