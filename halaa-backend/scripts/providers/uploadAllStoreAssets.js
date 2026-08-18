const fs = require("fs");
const path = require("path");
const { createGoogleAccessToken } = require("./auth/google");

async function uploadImage(baseUrl, editId, language, imageType, filePath, token) {
  const uploadUrl = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/com.halaa.app/edits/${editId}/listings/${language}/${imageType}?uploadType=media`;
  const fileData = fs.readFileSync(filePath);

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/png",
    },
    body: fileData,
  });

  const text = await res.text();
  console.log(`Upload [${language}] [${imageType}] ${path.basename(filePath)} -> Status: ${res.status}`);
  if (res.status !== 200) {
    console.error("  Error details:", text);
  }
}

async function main() {
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH =
    "C:\\Users\\B\\.halaa-provider-secrets\\google-play-revenuecat-service-account.json";
  const token = await createGoogleAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const baseUrl =
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.halaa.app";

  // Create Edit
  const editRes = await fetch(`${baseUrl}/edits`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const edit = await editRes.json();
  console.log("Created Edit ID:", edit.id);

  const assetsDir = path.join(__dirname, "../../../docs/store-readiness/assets");
  const screenshotsDir = path.join(assetsDir, "screenshots");

  const iconPath = path.join(assetsDir, "play-store-icon-512.png");
  const featureGraphicPath = path.join(
    assetsDir,
    "play-store-feature-graphic-1024x500.png"
  );

  for (const lang of ["ar", "en-US"]) {
    console.log(`\n--- Uploading assets for language: ${lang} ---`);
    await uploadImage(baseUrl, edit.id, lang, "icon", iconPath, token);
    await uploadImage(
      baseUrl,
      edit.id,
      lang,
      "featureGraphic",
      featureGraphicPath,
      token
    );

    // Upload 4 phone screenshots
    for (let i = 1; i <= 4; i++) {
      const phonePath = path.join(screenshotsDir, `phone-screenshot-${i}.png`);
      await uploadImage(baseUrl, edit.id, lang, "phoneScreenshots", phonePath, token);
    }

    // Upload tablet screenshots
    for (let i = 1; i <= 4; i++) {
      const tab7Path = path.join(screenshotsDir, `tablet-7in-screenshot-${i}.png`);
      const tab10Path = path.join(screenshotsDir, `tablet-10in-screenshot-${i}.png`);
      await uploadImage(baseUrl, edit.id, lang, "sevenInchScreenshots", tab7Path, token);
      await uploadImage(baseUrl, edit.id, lang, "tenInchScreenshots", tab10Path, token);
    }
  }

  // Commit Edit
  console.log("\nCommitting all store visual assets...");
  const commitRes = await fetch(`${baseUrl}/edits/${edit.id}:commit`, {
    method: "POST",
    headers,
  });
  console.log("Commit status:", commitRes.status, await commitRes.text());
}

main().catch(console.error);
