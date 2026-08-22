import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("RTL-05: app.json declares supportedLocales in expo-localization plugin config", () => {
  const file = path.join(mobileRoot, "app.json");
  const appJson = JSON.parse(fs.readFileSync(file, "utf8"));
  const plugins = appJson.expo.plugins;

  const localizationPlugin = plugins.find((p) => Array.isArray(p) && p[0] === "expo-localization");
  assert.ok(localizationPlugin, "expo-localization plugin must be configured with options");

  const options = localizationPlugin[1];
  assert.ok(options?.supportedLocales, "supportedLocales must be defined");
  assert.deepEqual(options.supportedLocales.ios, ["ar", "en"], "ios supportedLocales must contain ar and en");
  assert.deepEqual(options.supportedLocales.android, ["ar", "en"], "android supportedLocales must contain ar and en");
});
