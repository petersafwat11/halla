/**
 * Render non-DB visual proofs for precisionTemplateSpecs.js.
 *
 * This intentionally writes only to plans/template-audit-corrected/proofs.
 * It never connects to MongoDB or S3.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { CalendarDays, Clock, MapPin } = require("lucide-react");
const { TEMPLATES } = require("./precisionTemplateSpecs");

const ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_DIR = path.join(ROOT, "template-cards");
const REFERENCE_DIR = path.join(ROOT, "labbe", "public", "template-cards");
const OUTPUT_DIR = path.join(ROOT, "plans", "template-audit-corrected", "proofs");
const W = 900;
const H = 1600;

const ICONS = { CalendarDays, Clock, MapPin };

const COMMON = {
  invitationTitle: "دعوة",
  openingVerse: "بارك الله لكما وبارك عليكما وجمع بينكما في خير",
  invitationMessage: "بكل الحب والسرور\nنتشرف بدعوتكم لمشاركتنا\nهذه المناسبة السعيدة",
  eventNote: "يشرفنا حضوركم ومشاركتكم فرحتنا",
  mealNote: "يتبع الحفل تناول طعام العشاء",
  closingMessage: "بحضوركم تكتمل فرحتنا",
  attendanceNote: "الدعوة شخصية",
  groomName: "خالد",
  brideName: "سارة",
  groomNameLatin: "KHALID",
  brideNameLatin: "SARA",
  hostName: "محمد بن أحمد",
  celebrantName: "ليان",
  babyInitial: "Y",
  babyName: "يارا",
  babyNameLatin: "Yara",
  parentsNames: "أحمد وريم",
  eventTitle: "عنوان المناسبة",
  eventDate: "الجمعة\n١٦ يناير ٢٠٢٧",
  eventTime: "٨:٠٠\nمساءً",
  venue: "قاعة\nالماس",
};

const TITLES = {
  "Eid Al-Adha": "عيد الأضحى",
  "Ramadan Iftar": "سفرة إفطار رمضان",
  "Sacred Vows": "بشارة",
  "Newborn Boy": "baby",
  "Sacred Pilgrimage": "بشارة الحج",
  "Visionary Conference": "مؤتمر القادة",
};

const escapeXml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function fontFamily(value = "") {
  return /Cairo/i.test(value) ? "Arial, sans-serif" : "serif";
}

function textSvg(overlay, text) {
  const x = (overlay.leftPct / 100) * W;
  const y = (overlay.topPct / 100) * H;
  const size = (overlay.fontSizeVh / 100) * H;
  const lineHeight = size * (overlay.lineHeight || 1.35);
  const lines = String(text || overlay.fieldKey).split("\n").slice(0, overlay.maxLines || 10);
  const firstY = y - ((lines.length - 1) * lineHeight) / 2;
  const color = overlay.colorBinding === "custom" ? overlay.color : "#5a4a42";
  const anchor = overlay.textAlign === "right" ? "end" : overlay.textAlign === "left" ? "start" : "middle";
  return `<text x="${x}" y="${firstY}" fill="${color}" font-family="${fontFamily(overlay.fontFamily)}" font-size="${size}" font-weight="${overlay.fontWeight || 400}" text-anchor="${anchor}" direction="rtl" unicode-bidi="plaintext">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
}

function iconSvg(decoration) {
  const Component = ICONS[decoration.source];
  if (!Component) return "";
  const size = (decoration.iconSizeVh / 100) * H;
  const x = (decoration.leftPct / 100) * W - size / 2;
  const y = (decoration.topPct / 100) * H - size / 2;
  return renderToStaticMarkup(
    React.createElement(Component, {
      x,
      y,
      width: size,
      height: size,
      color: decoration.color || "#5a4a42",
      strokeWidth: 1.5,
    })
  );
}

function overlaySvg(template) {
  const data = { ...COMMON, eventTitle: TITLES[template.nameEn] || COMMON.eventTitle };
  const content = [
    ...(template.decorations || []).map(iconSvg),
    ...template.overlays.map((overlay) => textSvg(overlay, data[overlay.fieldKey])),
  ].join("\n");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${content}</svg>`);
}

async function render(template, index) {
  const source = path.join(SOURCE_DIR, template.file);
  if (!fs.existsSync(source)) throw new Error(`missing source: ${source}`);
  const sourcePng = await sharp(source).resize(W, H, { fit: "fill" }).png().toBuffer();
  const proof = await sharp(sourcePng).composite([{ input: overlaySvg(template), top: 0, left: 0 }]).png().toBuffer();
  const proofName = `${String(index + 1).padStart(2, "0")}-${template.file.replace(/\.[^.]+$/, "")}.png`;
  await sharp(proof).toFile(path.join(OUTPUT_DIR, proofName));

  const referencePath = template.polished ? path.join(REFERENCE_DIR, template.polished) : null;
  const hasReference = referencePath && fs.existsSync(referencePath);
  const panels = hasReference ? 3 : 2;
  const comparison = sharp({ create: { width: W * panels, height: H, channels: 3, background: "#ddd" } });
  const composites = [{ input: sourcePng, left: 0, top: 0 }, { input: proof, left: W, top: 0 }];
  if (hasReference) {
    composites.push({ input: await sharp(referencePath).resize(W, H, { fit: "fill" }).png().toBuffer(), left: W * 2, top: 0 });
  }
  await comparison.composite(composites).png().toFile(path.join(OUTPUT_DIR, `compare-${proofName}`));
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (let index = 0; index < TEMPLATES.length; index += 1) {
    await render(TEMPLATES[index], index);
  }
  console.log(`[proof] rendered ${TEMPLATES.length} templates to ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error("[proof] FAILED:", error);
  process.exitCode = 1;
});

