const { createGoogleAccessToken } = require("../auth/google");
const { requestJson } = require("../lib/http");

const BASE_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

async function collectGooglePages(url, headers, property) {
  const items = [];
  let pageToken = null;
  do {
    const current = new URL(url);
    current.searchParams.set("pageSize", "1000");
    if (pageToken) current.searchParams.set("pageToken", pageToken);
    // Google may return 204 No Content for a newly created app with an empty
    // monetization catalog. Normalize that valid empty response to an object.
    const page = (await requestJson(current, { headers })) || {};
    items.push(...(page[property] || []));
    pageToken = page.nextPageToken || null;
  } while (pageToken);
  return items;
}

async function exportGoogle() {
  const packageName = process.env.GOOGLE_PACKAGE_NAME || "com.halaa.app";
  const token = await createGoogleAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const packagePath = `${BASE_URL}/${encodeURIComponent(packageName)}`;

  const [subscriptions, oneTimeProducts] = await Promise.all([
    collectGooglePages(`${packagePath}/subscriptions`, headers, "subscriptions"),
    collectGooglePages(`${packagePath}/oneTimeProducts`, headers, "oneTimeProducts"),
  ]);
  return { provider: "google", packageName, subscriptions, oneTimeProducts };
}

async function readGoogleRegionsVersion() {
  const packageName = process.env.GOOGLE_PACKAGE_NAME || "com.halaa.app";
  const token = await createGoogleAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const result = await requestJson(
    `${BASE_URL}/${encodeURIComponent(packageName)}/pricing:convertRegionPrices`,
    {
      method: "POST",
      headers,
      body: { price: { currencyCode: "SAR", units: "1", nanos: 0 } },
    },
  );
  if (!result.regionVersion?.version) {
    throw new Error("Google convertRegionPrices did not return regionVersion.version");
  }
  return {
    provider: "google",
    packageName,
    operation: "READ_CURRENT_REGIONS_VERSION",
    externalPersistentWrites: 0,
    regionsVersion: result.regionVersion.version,
  };
}

module.exports = { exportGoogle, readGoogleRegionsVersion };
