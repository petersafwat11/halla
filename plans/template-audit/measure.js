/**
 * measure.js — READ-ONLY visual measurement tool for the template-card audit.
 *
 * Phase 1 (analysis only). Touches NO database, NO S3, and does NOT modify
 * any production image. It only READS the reference PNGs + source JPGs and
 * WRITES analysis artifacts into plans/template-audit/out/.
 *
 * Method (per advisor): dynamic text = reference pixels − source pixels.
 *   1. Downscale both ref + src to a common WxH (keeps 9:16).
 *   2. Grayscale abs-diff, threshold -> binary mask of "what changed".
 *   3. Separable dilation (more horizontal than vertical) to merge glyphs
 *      of a word/line/paragraph into one block, while keeping the three
 *      metadata columns separate.
 *   4. Connected-components labeling -> bounding boxes.
 *   5. Filter tiny/noise components by area.
 *   6. For each box report CENTER coords (because OverlayItem uses
 *      translate(-50%,-50%)): topPct/leftPct = centroid, widthPct/heightPct,
 *      plus a sampled text colour (median of changed pixels from the
 *      REFERENCE inside the box).
 *   7. Emit an annotated PNG: downscaled reference + 10% grid + numbered
 *      detected boxes, so the numbers are auditable by eye.
 *
 * Usage:
 *   node measure.js            # all 16 mapped pairs + 4 grid-only sources
 *   node measure.js 1 12       # only those reference numbers
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

sharp.cache(false);

const REF_DIR = path.resolve(__dirname, "..", "..", "labbe", "public", "template-cards");
const SRC_DIR = path.resolve(__dirname, "..", "..", "template-cards");
const OUT_DIR = path.resolve(__dirname, "out");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Working resolution — 9:16, 1/10 of natural (4500x8000).
const W = 450;
const H = 800;

const PAIRS = [
  { num: 1, ref: "1.png", src: "marriage.jpg", name: "Royal Groom" },
  { num: 2, ref: "2.png", src: "wedding_white_dawah.jpg", name: "Pearl Da'wah Wedding" },
  { num: 3, ref: "3.png", src: "wedding_navy_dawah.jpg", name: "Royal Da'wah Wedding" },
  { num: 4, ref: "4.png", src: "wedding_gulf_groom.jpg", name: "Gulf Groom" },
  { num: 5, ref: "5.png", src: "blessed_births.jpg", name: "Rose Garden Wedding" },
  { num: 6, ref: "6.png", src: "woman_invitation.jpg", name: "Burgundy Bloom Wedding" },
  { num: 7, ref: "7.png", src: "marriage2.jpg", name: "Floral Arch Wedding" },
  { num: 8, ref: "8.png", src: "engament.jpg", name: "Candle Engagement" },
  { num: 9, ref: "9.png", src: "marriage_contract_arch.jpg", name: "Sacred Vows" },
  { num: 10, ref: "10.png", src: "general_spring.jpg", name: "Eid Al-Adha" },
  { num: 11, ref: "11.png", src: "general_lantern.jpg", name: "Ramadan Iftar" },
  { num: 12, ref: "12.png", src: "birthday.jpg", name: "Birthday Party" },
  { num: 13, ref: "13.png", src: "newborn_boy.jpg", name: "Newborn Boy" },
  { num: 14, ref: "14.jpg", src: "newborn_girl.jpg", name: "Newborn Girl" },
  { num: 15, ref: "15.png", src: "marriage_contract_bronze.jpg", name: "Graduation Celebration" },
  { num: 16, ref: "16.png", src: "engagement_pearl.jpg", name: "Pearl Promise" },
];

const GRID_ONLY = [
  { src: "wedding_navy_frame.jpg" },
  { src: "wedding_white_frame.jpg" },
  { src: "general_pilgrimage.jpg" },
  { src: "conference.jpg" },
];

// thresholds / sizes (tunable)
const THRESH = 32; // gray abs-diff threshold
const DIL_X = 11; // horizontal dilation radius (merge words on a line + paragraph)
const DIL_Y = 6; // vertical dilation radius
const MIN_AREA_PX = Math.round(0.0006 * W * H); // ~0.06% of image (~216px at 450x800)

async function grayRaw(file) {
  const buf = await sharp(file)
    .resize(W, H, { fit: "fill" })
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer();
  return buf; // Uint8, length W*H
}

async function rgbRaw(file) {
  const { data } = await sharp(file)
    .resize(W, H, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data; // length W*H*3
}

// border margin (px) to ignore — kills JPEG edge / baked-frame noise
const MARGIN_X = Math.round(0.02 * W);
const MARGIN_Y = Math.round(0.015 * H);

function diffMask(g1, g2) {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x < MARGIN_X || x >= W - MARGIN_X || y < MARGIN_Y || y >= H - MARGIN_Y) continue;
      m[i] = Math.abs(g1[i] - g2[i]) > THRESH ? 1 : 0;
    }
  }
  return m;
}

// separable box dilation
function dilate(mask, rx, ry) {
  const tmp = new Uint8Array(W * H);
  // horizontal
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let on = 0;
      for (let dx = -rx; dx <= rx; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < W && mask[row + nx]) {
          on = 1;
          break;
        }
      }
      tmp[row + x] = on;
    }
  }
  const out = new Uint8Array(W * H);
  // vertical
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let on = 0;
      for (let dy = -ry; dy <= ry; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < H && tmp[ny * W + x]) {
          on = 1;
          break;
        }
      }
      out[y * W + x] = on;
    }
  }
  return out;
}

// connected components (4/8-conn) via iterative flood fill on dilated mask.
function components(dmask) {
  const labels = new Int32Array(W * H).fill(0);
  const comps = [];
  let next = 0;
  const stack = [];
  for (let s = 0; s < W * H; s++) {
    if (!dmask[s] || labels[s]) continue;
    next++;
    let minX = W,
      minY = H,
      maxX = 0,
      maxY = 0,
      area = 0;
    stack.length = 0;
    stack.push(s);
    labels[s] = next;
    while (stack.length) {
      const p = stack.pop();
      const px = p % W;
      const py = (p - px) / W;
      area++;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      // 8-neighbourhood
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = px + dx,
            ny = py + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const np = ny * W + nx;
          if (dmask[np] && !labels[np]) {
            labels[np] = next;
            stack.push(np);
          }
        }
      }
    }
    comps.push({ id: next, minX, minY, maxX, maxY, area });
  }
  return comps;
}

// median colour of changed pixels (from reference) inside a bbox
function sampleColor(refRGB, rawMask, box) {
  const rs = [],
    gs = [],
    bs = [];
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const p = y * W + x;
      if (!rawMask[p]) continue;
      rs.push(refRGB[p * 3]);
      gs.push(refRGB[p * 3 + 1]);
      bs.push(refRGB[p * 3 + 2]);
    }
  }
  if (!rs.length) return null;
  const med = (a) => {
    a.sort((x, y) => x - y);
    return a[Math.floor(a.length / 2)];
  };
  const r = med(rs),
    g = med(gs),
    b = med(bs);
  const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return hex;
}

function svgAnnotate(boxes, title) {
  const grid = [];
  for (let p = 10; p < 100; p += 10) {
    const x = (p / 100) * W;
    const y = (p / 100) * H;
    grid.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,0,255,0.35)" stroke-width="1"/>`
    );
    grid.push(
      `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(0,200,255,0.45)" stroke-width="1"/>`
    );
    grid.push(`<text x="2" y="${y - 2}" fill="#00c8ff" font-size="11" font-family="monospace">${p}</text>`);
    grid.push(`<text x="${x + 2}" y="11" fill="#ff00ff" font-size="11" font-family="monospace">${p}</text>`);
  }
  const rects = boxes
    .map((b, i) => {
      const x = (b.leftPct / 100) * W - ((b.widthPct / 100) * W) / 2;
      const y = (b.topPct / 100) * H - ((b.heightPct / 100) * H) / 2;
      const w = (b.widthPct / 100) * W;
      const h = (b.heightPct / 100) * H;
      return (
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ffeb00" stroke-width="2"/>` +
        `<text x="${x}" y="${y - 2}" fill="#ffeb00" font-size="13" font-weight="bold" font-family="monospace">${i + 1}</text>`
      );
    })
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${grid.join("")}${rects}` +
      `<text x="4" y="${H - 6}" fill="#fff" font-size="13" font-family="monospace" stroke="#000" stroke-width="0.4">${title}</text></svg>`
  );
}

async function gridOnly(file, label) {
  const base = await sharp(file).resize(W, H, { fit: "fill" }).png().toBuffer();
  const svg = svgAnnotate([], label);
  const outPng = path.join(OUT_DIR, `grid_${label}.png`);
  await sharp(base).composite([{ input: svg, top: 0, left: 0 }]).toFile(outPng);
  console.log(`[grid] ${label} -> ${path.basename(outPng)}`);
}

async function processPair(pair) {
  const refPath = path.join(REF_DIR, pair.ref);
  const srcPath = path.join(SRC_DIR, pair.src);
  if (!fs.existsSync(refPath) || !fs.existsSync(srcPath)) {
    console.warn(`[skip] #${pair.num} missing ${pair.ref} or ${pair.src}`);
    return null;
  }
  const [gRef, gSrc, refRGB] = await Promise.all([
    grayRaw(refPath),
    grayRaw(srcPath),
    rgbRaw(refPath),
  ]);
  const raw = diffMask(gRef, gSrc);
  const changedPx = raw.reduce((a, v) => a + v, 0);
  const dil = dilate(raw, DIL_X, DIL_Y);
  const comps = components(dil).filter((c) => c.area >= MIN_AREA_PX);

  const boxes = comps
    .map((c) => {
      const cx = (c.minX + c.maxX) / 2;
      const cy = (c.minY + c.maxY) / 2;
      const wpx = c.maxX - c.minX + 1;
      const hpx = c.maxY - c.minY + 1;
      return {
        leftPct: +((cx / W) * 100).toFixed(1),
        topPct: +((cy / H) * 100).toFixed(1),
        widthPct: +((wpx / W) * 100).toFixed(1),
        heightPct: +((hpx / H) * 100).toFixed(1),
        areaPct: +((c.area / (W * H)) * 100).toFixed(2),
        color: sampleColor(refRGB, raw, c),
      };
    })
    // reading order: top-to-bottom, then left-to-right
    .sort((a, b) => a.topPct - b.topPct || a.leftPct - b.leftPct);

  // annotated reference (grid + numbered dynamic boxes)
  const refBase = await sharp(refPath).resize(W, H, { fit: "fill" }).png().toBuffer();
  const refAnn = await sharp(refBase)
    .composite([{ input: svgAnnotate(boxes, `REF #${pair.num} ${pair.name}`), top: 0, left: 0 }])
    .png()
    .toBuffer();
  // gridded source (no boxes) to eyeball what is baked-in
  const srcBase = await sharp(srcPath).resize(W, H, { fit: "fill" }).png().toBuffer();
  const srcGrid = await sharp(srcBase)
    .composite([{ input: svgAnnotate([], `SRC ${pair.src}`), top: 0, left: 0 }])
    .png()
    .toBuffer();
  // one combined artifact per card: annotated REF | gridded SRC
  const sbsW = W * 2 + 10;
  const sbs = await sharp({
    create: { width: sbsW, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite([
      { input: refAnn, top: 0, left: 0 },
      { input: srcGrid, top: 0, left: W + 10 },
    ])
    .png()
    .toBuffer();
  const sbsPng = path.join(OUT_DIR, `card_${String(pair.num).padStart(2, "0")}_${pair.src.replace(/\.[^.]+$/, "")}.png`);
  await sharp(sbs).toFile(sbsPng);

  const result = {
    num: pair.num,
    name: pair.name,
    ref: pair.ref,
    src: pair.src,
    changedPctOfImage: +((changedPx / (W * H)) * 100).toFixed(2),
    boxCount: boxes.length,
    boxes,
  };
  console.log(
    `[#${pair.num}] ${pair.name.padEnd(24)} changed=${result.changedPctOfImage}%  boxes=${boxes.length}`
  );
  return result;
}

async function main() {
  const only = process.argv.slice(2).map(Number).filter((n) => !isNaN(n));
  const pairs = only.length ? PAIRS.filter((p) => only.includes(p.num)) : PAIRS;

  const results = [];
  for (const p of pairs) {
    const r = await processPair(p);
    if (r) results.push(r);
  }
  if (!only.length) {
    for (const g of GRID_ONLY) {
      await gridOnly(path.join(SRC_DIR, g.src), g.src.replace(/\.[^.]+$/, ""));
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, "measurements.json"), JSON.stringify(results, null, 2));
  console.log(`\n[done] ${results.length} pairs -> ${path.join(OUT_DIR, "measurements.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
