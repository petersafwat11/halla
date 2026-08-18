const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function prepareAppleScreenshots() {
  const landingDir = path.join(__dirname, "../../../halaa-web/public/landing");
  const outputDir = path.join(
    __dirname,
    "../../../docs/store-readiness/assets/apple-screenshots"
  );
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const steps = ["step1.jpg", "step2.jpg", "step3.jpg", "step4.jpg"];

  for (let i = 0; i < steps.length; i++) {
    const srcPath = path.join(landingDir, steps[i]);

    // 1. Apple 6.5" Display (1284 x 2778 px)
    const out65Path = path.join(
      outputDir,
      `apple-6.5in-screenshot-${i + 1}.png`
    );
    await sharp(srcPath)
      .resize(1284, 2778, { fit: "cover", position: "top" })
      .png({ quality: 100 })
      .toFile(out65Path);

    // 2. Apple 6.7" Display (1290 x 2796 px)
    const out67Path = path.join(
      outputDir,
      `apple-6.7in-screenshot-${i + 1}.png`
    );
    await sharp(srcPath)
      .resize(1290, 2796, { fit: "cover", position: "top" })
      .png({ quality: 100 })
      .toFile(out67Path);

    console.log(`✅ Generated Apple Screenshots for Step ${i + 1}`);
  }
}

prepareAppleScreenshots().catch(console.error);
