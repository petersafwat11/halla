const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("mobile admin list components bypass client filtering when server-controlled", () => {
  const lists = [
    { name: "AdminEventList", path: ["components", "admin-dashboard", "events", "AdminEventList.js"] },
    { name: "HostList", path: ["components", "admin-dashboard", "hosts", "HostList.js"] },
    { name: "ModeratorList", path: ["components", "admin-dashboard", "moderators", "ModeratorList.js"] },
    { name: "VendorList", path: ["components", "admin-dashboard", "vendors", "VendorList.js"] },
  ];

  for (const list of lists) {
    const source = read(...list.path);
    assert.match(
      source,
      /isServerControlled/,
      `${list.name} must define isServerControlled condition`
    );
    assert.match(
      source,
      /if\s*\(\s*isServerControlled\s*\)\s*return/,
      `${list.name} must return list directly when server-controlled to avoid double-filtering`
    );
  }
});