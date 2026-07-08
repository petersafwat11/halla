const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Read seedTemplateCards.js content
const scriptPath = path.join(__dirname, 'seedTemplateCards.js');
let content = fs.readFileSync(scriptPath, 'utf8');

// Replace the main execution at the bottom to export TEMPLATES instead of running
content = content.replace(/main\(\)\.catch[\s\S]*$/, 'module.exports = { TEMPLATES };');

// Write to a temporary file in the same directory and load it
const tempScriptPath = path.join(__dirname, 'temp_seedTemplateCards.js');
fs.writeFileSync(tempScriptPath, content, 'utf8');

const { TEMPLATES } = require(tempScriptPath);
console.log(`Loaded ${TEMPLATES.length} templates.`);

// Clean up temporary script
try {
  fs.unlinkSync(tempScriptPath);
} catch (e) {}

const POLISHED_DIR = path.join(__dirname, '..', '..', 'labbe', 'public', 'template-cards');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'template-cards', 'verify'); // Save in template-cards/verify

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function renderCardVerification(tpl, idx) {
  if (!tpl.polished) {
    console.log(`Skipping template #${idx+1}: ${tpl.nameEn} (no polished mockup)`);
    return;
  }

  const polPath = path.join(POLISHED_DIR, tpl.polished);
  if (!fs.existsSync(polPath)) {
    console.log(`Mockup not found for template #${idx+1}: ${polPath}`);
    return;
  }

  const metadata = await sharp(polPath).metadata();
  const w = metadata.width;
  const h = metadata.height;

  // Create SVG overlay with bounding boxes
  let svgContent = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`;

  // Draw overlays as semi-transparent red rectangles
  tpl.overlays.forEach(o => {
    const boxWidth = (o.widthPct / 100) * w;
    const boxHeight = (o.fontSizeVh / 100) * h;
    const x = ((o.leftPct / 100) * w) - (boxWidth / 2);
    const y = ((o.topPct / 100) * h) - (boxHeight / 2);

    svgContent += `
      <!-- Overlay: ${o.fieldKey} -->
      <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="rgba(255, 0, 0, 0.2)" stroke="red" stroke-width="2" />
      <text x="${x}" y="${y - 4}" fill="red" font-size="14" font-weight="bold" font-family="sans-serif">${o.fieldKey}</text>
    `;
  });

  // Draw decorations as semi-transparent blue rectangles
  if (tpl.decorations) {
    tpl.decorations.forEach(d => {
      const boxWidth = (d.widthPct / 100) * w;
      const boxHeight = (d.iconSizeVh / 100) * h;
      const x = ((d.leftPct / 100) * w) - (boxWidth / 2);
      const y = ((d.topPct / 100) * h) - (boxHeight / 2);

      svgContent += `
        <!-- Decoration: ${d.source} -->
        <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="rgba(0, 0, 255, 0.2)" stroke="blue" stroke-width="2" />
        <text x="${x}" y="${y - 4}" fill="blue" font-size="12" font-weight="bold" font-family="sans-serif">${d.source}</text>
      `;
    });
  }

  svgContent += `</svg>`;

  const svgBuffer = Buffer.from(svgContent);
  const outPath = path.join(OUTPUT_DIR, `verify_${idx+1}_${tpl.nameEn.replace(/[^a-zA-Z0-9]/g, '_')}.png`);

  await sharp(polPath)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .toFile(outPath);

  console.log(`Generated verification image: ${outPath}`);
}

async function run() {
  for (let i = 0; i < TEMPLATES.length; i++) {
    try {
      await renderCardVerification(TEMPLATES[i], i);
    } catch (err) {
      console.error(`Error rendering template ${TEMPLATES[i].nameEn}:`, err);
    }
  }
}

run();