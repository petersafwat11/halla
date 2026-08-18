const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function generateGraphics() {
  const outputDir = path.join(__dirname, "../../../docs/store-readiness/assets");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const iconSrc = path.join(__dirname, "../../../halaa-mobile/assets/icon.png");

  // 1. Generate 512x512 Store Icon
  const icon512Path = path.join(outputDir, "play-store-icon-512.png");
  await sharp(iconSrc)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(icon512Path);
  console.log("✅ Generated 512x512 Icon:", icon512Path);

  // 2. Generate 1024x500 Feature Graphic
  const featureGraphicPath = path.join(outputDir, "play-store-feature-graphic-1024x500.png");

  // Read the icon resized for center embedding in banner
  const centeredIcon = await sharp(iconSrc)
    .resize(260, 260, { fit: "contain" })
    .toBuffer();

  // Create an elegant background matching Halaa's brand aesthetic
  // Warm sand/cream to rich luxury tone: #8C6D53 or #1C1917 / #FBF8F5
  const svgBanner = `
  <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1A1817"/>
        <stop offset="50%" stop-color="#2D2825"/>
        <stop offset="100%" stop-color="#151312"/>
      </linearGradient>
      <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#C5A880" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#C5A880" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#brandGrad)"/>
    <circle cx="512" cy="250" r="320" fill="url(#goldGlow)"/>
    <text x="512" y="390" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#FBF8F5" text-anchor="middle" letter-spacing="2">هلا | HALAA</text>
    <text x="512" y="430" font-family="Arial, sans-serif" font-size="18" fill="#C5A880" text-anchor="middle" letter-spacing="1">منصة إدارة المناسبات والدعوات الرقمية</text>
  </svg>
  `;

  await sharp(Buffer.from(svgBanner))
    .composite([{ input: centeredIcon, top: 90, left: 382 }])
    .png()
    .toFile(featureGraphicPath);

  console.log("✅ Generated 1024x500 Feature Graphic:", featureGraphicPath);
}

generateGraphics().catch(console.error);
