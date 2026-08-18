const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function prepareScreenshots() {
  const landingDir = path.join(__dirname, "../../../halaa-web/public/landing");
  const outputDir = path.join(__dirname, "../../../docs/store-readiness/assets/screenshots");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const steps = ["step1.jpg", "step2.jpg", "step3.jpg", "step4.jpg"];

  for (let i = 0; i < steps.length; i++) {
    const srcPath = path.join(landingDir, steps[i]);
    const outPhonePath = path.join(outputDir, `phone-screenshot-${i + 1}.png`);
    const out7TabletPath = path.join(outputDir, `tablet-7in-screenshot-${i + 1}.png`);
    const out10TabletPath = path.join(outputDir, `tablet-10in-screenshot-${i + 1}.png`);

    // 1. Phone screenshot: Resize / pad to crisp 1080 x 2340 PNG
    await sharp(srcPath)
      .resize(1080, 2340, { fit: "cover", position: "top" })
      .png({ quality: 100 })
      .toFile(outPhonePath);

    // 2. 7-inch tablet screenshot (1200 x 1920)
    await sharp(srcPath)
      .resize(1200, 1920, { fit: "cover", position: "center" })
      .png({ quality: 100 })
      .toFile(out7TabletPath);

    // 3. 10-inch tablet screenshot (1600 x 2560)
    await sharp(srcPath)
      .resize(1600, 2560, { fit: "cover", position: "center" })
      .png({ quality: 100 })
      .toFile(out10TabletPath);

    console.log(`✅ Processed Step ${i + 1}: ${outPhonePath}`);
  }
}

prepareScreenshots().catch(console.error);
