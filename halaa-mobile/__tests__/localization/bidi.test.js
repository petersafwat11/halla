const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const SHARED_ROOT = path.resolve(__dirname, "..", "..", "..", "shared");

test("BiDi Unicode constants match standard isolates", async () => {
  const bidiPath = path.join(SHARED_ROOT, "src", "utils", "bidi.js");
  const { LRI, RLI, FSI, PDI } = await import(pathToFileURL(bidiPath).href);

  assert.equal(LRI, "\u2066", "LRI must be U+2066");
  assert.equal(RLI, "\u2067", "RLI must be U+2067");
  assert.equal(FSI, "\u2068", "FSI must be U+2068");
  assert.equal(PDI, "\u2069", "PDI must be U+2069");
});

test("isolateLtr wraps nonempty text with LRI and PDI", async () => {
  const bidiPath = path.join(SHARED_ROOT, "src", "utils", "bidi.js");
  const { isolateLtr, LRI, PDI } = await import(pathToFileURL(bidiPath).href);

  assert.equal(isolateLtr(""), "");
  assert.equal(isolateLtr(null), "");
  assert.equal(isolateLtr(undefined), "");

  // Entity name
  const entity = "Afaq hala Company For Communications and Information";
  assert.equal(isolateLtr(entity), `${LRI}${entity}${PDI}`);

  // Email
  const email = "support@halaa.com.sa";
  assert.equal(isolateLtr(email), `${LRI}${email}${PDI}`);

  // Phone number
  const phone = "+966 55 261 9282";
  assert.equal(isolateLtr(phone), `${LRI}${phone}${PDI}`);

  // Percentages
  assert.equal(isolateLtr("15%"), `${LRI}15%${PDI}`);
  assert.equal(isolateLtr("+15%"), `${LRI}+15%${PDI}`);
  assert.equal(isolateLtr("١٥٪"), `${LRI}١٥٪${PDI}`);

  // Store names
  const stores = "App Store / Google Play";
  assert.equal(isolateLtr(stores), `${LRI}${stores}${PDI}`);
});

test("isolateRtl and isolateAuto wrap with appropriate isolate marks", async () => {
  const bidiPath = path.join(SHARED_ROOT, "src", "utils", "bidi.js");
  const { isolateRtl, isolateAuto, RLI, FSI, PDI } = await import(pathToFileURL(bidiPath).href);

  assert.equal(isolateRtl("هلا"), `${RLI}هلا${PDI}`);
  assert.equal(isolateAuto("hello"), `${FSI}hello${PDI}`);
  assert.equal(isolateRtl(null), "");
  assert.equal(isolateAuto(undefined), "");
});
