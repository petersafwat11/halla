const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Disable sharp caching to prevent file locking on Windows when overwriting source files
sharp.cache(false);

const POLISHED_DIR = path.resolve(__dirname, '..', '..', 'labbe', 'public', 'template-cards');
const RAW_DIR = path.resolve(__dirname, '..', '..', 'template-cards');

// Bounding boxes in percentage heights to crop calligraphy from polished PNG and overlay onto raw JPG.
const JOBS = [
  { num: 1, raw: "marriage.jpg", polished: "1.png", yStart: 28, yEnd: 40, label: "دعوة" },
  { num: 4, raw: "wedding_gulf_groom.jpg", polished: "4.png", yStart: 38, yEnd: 50, label: "دعوة" },
  { num: 5, raw: "blessed_births.jpg", polished: "5.png", yStart: 26, yEnd: 38, label: "دعوة" },
  { num: 6, raw: "woman_invitation.jpg", polished: "6.png", yStart: 4, yEnd: 12, label: "دعوة" },
  { num: 7, raw: "marriage2.jpg", polished: "7.png", yStart: 5, yEnd: 15, label: "دعوة" },
  { num: 8, raw: "engament.jpg", polished: "8.png", yStart: 4, yEnd: 12, label: "خطوبة / دعوة" },
  { num: 9, raw: "marriage_contract_arch.jpg", polished: "9.png", yStart: 4, yEnd: 12, label: "عقد قران" },
  { num: 10, raw: "general_spring.jpg", polished: "10.png", yStart: 24, yEnd: 36, label: "عيد الأضحى" },
  { num: 11, raw: "general_lantern.jpg", polished: "11.png", yStart: 34, yEnd: 46, label: "سفرة إفطار رمضان" },
  { num: 13, raw: "newborn_boy.jpg", polished: "13.png", yStart: 16, yEnd: 28, label: "بشارة مولود" },
  { num: 16, raw: "engagement_pearl.jpg", polished: "16.png", yStart: 5, yEnd: 15, label: "خطوبة / دعوة" }
];

const OTHER_RAW_TO_RESIZE = [
  "wedding_white_dawah.jpg",
  "wedding_navy_dawah.jpg",
  "birthday.jpg",
  "newborn_girl.jpg",
  "marriage_contract_bronze.jpg",
  "wedding_navy_frame.jpg",
  "wedding_white_frame.jpg",
  "general_pilgrimage.jpg",
  "conference.jpg"
];

async function processJob(job) {
  const pPath = path.join(POLISHED_DIR, job.polished);
  const rPath = path.join(RAW_DIR, job.raw);

  if (!fs.existsSync(pPath) || !fs.existsSync(rPath)) {
    console.warn(`[bake] Missing files for template #${job.num}: ${job.polished} or ${job.raw}`);
    return;
  }

  console.log(`[bake] Processing Template #${job.num}: ${job.raw} (${job.label})`);

  // Get polished metadata
  const pMeta = await sharp(pPath).metadata();
  const w = pMeta.width;
  const h = pMeta.height;

  // Calculate crop coordinates
  const cropTop = Math.round((job.yStart / 100) * h);
  const cropHeight = Math.round(((job.yEnd - job.yStart) / 100) * h);

  // 1. Crop the calligraphy area from polished PNG
  const cropBuffer = await sharp(pPath)
    .extract({ left: 0, top: cropTop, width: w, height: cropHeight })
    .toBuffer();

  // 2. Resize raw image to match polished dimensions (4500x8000)
  const resizedRawBuffer = await sharp(rPath)
    .resize(w, h, { fit: 'fill' })
    .toBuffer();

  // 3. Composite the crop onto the resized raw background at the exact same location
  await sharp(resizedRawBuffer)
    .composite([{ input: cropBuffer, top: cropTop, left: 0 }])
    .toFile(rPath);

  console.log(`[bake]   Baked and saved to ${rPath}`);
}

async function resizeRawImage(filename) {
  const rPath = path.join(RAW_DIR, filename);
  if (!fs.existsSync(rPath)) {
    console.warn(`[bake] Missing raw file to resize: ${filename}`);
    return;
  }
  const meta = await sharp(rPath).metadata();
  if (meta.width === 4500 && meta.height === 8000) {
    console.log(`[bake] Resize skipped (already 4500x8000): ${filename}`);
    return;
  }
  console.log(`[bake] Resizing raw background to 4500x8000: ${filename}`);
  const buffer = await sharp(rPath)
    .resize(4500, 8000, { fit: 'fill' })
    .toBuffer();
  await sharp(buffer).toFile(rPath);
  console.log(`[bake]   Resized and saved: ${filename}`);
}

async function run() {
  for (const job of JOBS) {
    await processJob(job);
  }
  for (const filename of OTHER_RAW_TO_RESIZE) {
    await resizeRawImage(filename);
  }
  console.log("[bake] Complete!");
}

run().catch(console.error);
