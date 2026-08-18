const fs = require("fs");
const { createGoogleAccessToken } = require("./auth/google");

function tsvToCsv(tsv) {
  return tsv
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return "";
      const cols = line.split("\t");
      return cols
        .map((col) => {
          if (col.includes(",") || col.includes('"') || col.includes("\n")) {
            return '"' + col.replace(/"/g, '""') + '"';
          }
          return col;
        })
        .join(",");
    })
    .join("\n");
}

async function main() {
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH =
    "C:\\Users\\B\\.halaa-provider-secrets\\google-play-revenuecat-service-account.json";
  const token = await createGoogleAccessToken();
  const headers = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };
  const url =
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.halaa.app/dataSafety";

  const tsvContent = fs.readFileSync(
    "d:/halla/docs/store-readiness/store-metadata/google-data-safety.csv",
    "utf8"
  );
  const csvContent = tsvToCsv(tsvContent);

  console.log("Sending converted CSV to Google Play API...");
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ safetyLabels: csvContent }),
  });
  console.log("Status:", res.status, await res.text());
}

main().catch(console.error);
