#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const expectedPath = path.join(repoRoot, "docs", "store-readiness", "store-metadata", "privacy-console-expected.json");
const actualArg = process.argv.find((arg) => arg.startsWith("--actual="));
if (!actualArg) {
  console.error("usage: node scripts/privacy/compareConsolePrivacy.js --actual=<normalized-console-export.json>");
  process.exit(2);
}

const actualPath = path.resolve(process.cwd(), actualArg.slice("--actual=".length));
const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
const actual = JSON.parse(fs.readFileSync(actualPath, "utf8"));

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};

const left = JSON.stringify(canonical(expected));
const right = JSON.stringify(canonical(actual));
if (left !== right) {
  console.error(`PRIVACY_CONSOLE_DRIFT\nexpected=${expectedPath}\nactual=${actualPath}`);
  process.exit(1);
}
console.log("PRIVACY_CONSOLE_ZERO_DRIFT");
