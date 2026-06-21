/**
 * zoom.js — crop a vertical band from a NATIVE-resolution reference (or
 * source) so Arabic text / names are legible. READ-ONLY; writes only into
 * out/zoom/.  Usage:  node zoom.js <file> <yStartPct> <yEndPct> [label]
 *   node zoom.js 5.png 26 40 names5
 *   node zoom.js marriage.jpg 38 52 src4
 * file is resolved against the reference dir first, then the source dir.
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
sharp.cache(false);

const REF_DIR = path.resolve(__dirname, "..", "..", "labbe", "public", "template-cards");
const SRC_DIR = path.resolve(__dirname, "..", "..", "template-cards");
const OUT = path.resolve(__dirname, "out", "zoom");
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const [file, y0, y1, label] = process.argv.slice(2);
  const yStart = Number(y0), yEnd = Number(y1);
  let p = path.join(REF_DIR, file);
  if (!fs.existsSync(p)) p = path.join(SRC_DIR, file);
  if (!fs.existsSync(p)) { console.error("not found:", file); process.exit(1); }

  const meta = await sharp(p).metadata();
  const top = Math.round((yStart / 100) * meta.height);
  const h = Math.round(((yEnd - yStart) / 100) * meta.height);
  const OUTW = 1000;
  const scale = OUTW / meta.width;
  const outH = Math.round(h * scale);

  const cropped = await sharp(p)
    .extract({ left: 0, top, width: meta.width, height: h })
    .resize(OUTW)
    .png()
    .toBuffer();

  // vertical % grid lines every 5%
  const lines = [];
  for (let xp = 5; xp < 100; xp += 5) {
    const x = (xp / 100) * OUTW;
    const major = xp % 10 === 0;
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${outH}" stroke="${major ? "rgba(255,0,255,0.5)" : "rgba(255,0,255,0.22)"}" stroke-width="${major ? 1.5 : 1}"/>`);
    if (major) lines.push(`<text x="${x + 2}" y="13" fill="#ff00ff" font-size="13" font-family="monospace">${xp}</text>`);
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUTW}" height="${outH}">${lines.join("")}<text x="3" y="${outH - 4}" fill="#0f0" font-size="13" font-family="monospace" stroke="#000" stroke-width="0.4">${file} y=${yStart}-${yEnd}%</text></svg>`);
  const outFile = path.join(OUT, `${label || file.replace(/\.[^.]+$/, "")}_${yStart}-${yEnd}.png`);
  await sharp(cropped).composite([{ input: svg, top: 0, left: 0 }]).toFile(outFile);
  console.log("wrote", outFile, `(${OUTW}x${outH}, native band ${top}..${top + h}px of ${meta.height})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
