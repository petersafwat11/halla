/**
 * Session 0 Web Incident Baseline & Error Reproduction Suite
 *
 * Reproduces and verifies:
 * 1. Missing imports in HostsTable, BusinessesTable, ModeratorsTable (WEB-02).
 * 2. Missing state and ref declarations in shared Table component (WEB-01).
 * 3. Query key divergences between SSR prefetch and browser hooks (WEB-05, WEB-06, WEB-14).
 * 4. Unused / orphaned Notifications module containing undefined hostAPI (WEB-16).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Session 0 — WEB-02: Hosts, Businesses, and Moderators tables call useMemo without importing it", () => {
  const files = [
    "app/[lang]/admin-dash/hosts/_components/HostsTable.jsx",
    "app/[lang]/admin-dash/businesses/_components/BusinessesTable.jsx",
    "app/[lang]/admin-dash/moderators/_components/ModeratorsTable.jsx",
  ];

  for (const relPath of files) {
    const fullPath = path.join(webRoot, relPath);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Check that useMemo is called
    assert.ok(content.includes("useMemo("), `${relPath} calls useMemo`);

    // Check that useMemo is NOT imported from "react"
    const reactImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+["']react["']/);
    assert.ok(reactImportMatch, `${relPath} imports from react`);
    const importedReactSymbols = reactImportMatch[1].split(",").map((s) => s.trim());

    const hasUseMemoImport = importedReactSymbols.includes("useMemo");
    assert.equal(
      hasUseMemoImport,
      false,
      `CONFIRMED DEFECT: ${relPath} calls useMemo() but only imports [${importedReactSymbols.join(", ")}] from 'react'`
    );
  }
});

test("Session 0 — WEB-01: Shared Table uses removed dropdown state and refs (27 undefined variable usages)", () => {
  const tablePath = path.join(webRoot, "ui/commen/new-table/Table.js");
  const content = fs.readFileSync(tablePath, "utf-8");

  const undefinedVariables = [
    "actionsTriggerRef",
    "dropdownRefs",
    "setDropdownPosition",
    "filterTriggerRef",
    "bulkTriggerRef",
    "actionsRef",
    "filterRef",
    "bulkActionsRef",
    "dropdownPosition",
  ];

  for (const varName of undefinedVariables) {
    // Check if the variable is referenced in the code
    const isUsed = new RegExp(`\\b${varName}\\b`).test(content);
    assert.ok(isUsed, `Variable ${varName} is referenced in Table.js`);

    // Check if it is declared (const varName, let varName, function varName, or param)
    const isDeclared = new RegExp(`(?:const|let|var|function|ref)\\s+${varName}\\b`).test(content) ||
      new RegExp(`const\\s+\\[[^\\]]*\\b${varName}\\b`).test(content);
    assert.equal(
      isDeclared,
      false,
      `CONFIRMED DEFECT: ${varName} is used in Table.js but is never declared (throws ReferenceError at runtime)`
    );
  }
});

test("Session 0 — WEB-16: Notifications component references undefined hostAPI and is orphaned", () => {
  const notifPath = path.join(webRoot, "ui/auth/notifictions/Notifictions.js");
  assert.ok(fs.existsSync(notifPath), "Orphaned Notifictions.js file exists");
  const content = fs.readFileSync(notifPath, "utf-8");

  // Check for hostAPI usage without import
  assert.ok(content.includes("hostAPI.notifications"), "Calls hostAPI.notifications");
  assert.ok(!content.includes("import hostAPI"), "hostAPI is never imported");

  // Check that the file is not imported anywhere in halaa-web
  const allWebFiles = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.name === "node_modules" || f.name === ".next" || f.name === "__tests__") continue;
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.(js|jsx|ts|tsx|mjs)$/.test(f.name)) allWebFiles.push(p);
    }
  }
  walk(webRoot);

  const importRegex = /from\s+["'].*notifictions.*["']/i;
  const importingFiles = allWebFiles.filter((file) => {
    if (file === notifPath) return false;
    const code = fs.readFileSync(file, "utf-8");
    return importRegex.test(code);
  });

  assert.equal(
    importingFiles.length,
    0,
    "CONFIRMED ORPHAN: ui/auth/notifictions/Notifictions.js is not imported by any active route"
  );
});

test("Session 0 — WEB-05 & WEB-06: Query key and filter divergences across admin list pages", () => {
  // Check Discounts: SSR prefetch vs Client hook
  const discountsPage = fs.readFileSync(
    path.join(webRoot, "app/[lang]/admin-dash/discounts/page.js"),
    "utf-8"
  );
  const discountsTable = fs.readFileSync(
    path.join(webRoot, "app/[lang]/admin-dash/discounts/_components/DiscountsTable.jsx"),
    "utf-8"
  );

  // In page.js, search defaults to undefined; in DiscountsTable, search defaults to ""
  assert.ok(discountsPage.includes("search: urlParams?.search || undefined"));
  assert.ok(discountsTable.includes('search: searchParams.get("search") || ""'));

  // Check Events: SSR prefetch vs EventsTable vs EventStats
  const eventsPage = fs.readFileSync(
    path.join(webRoot, "app/[lang]/admin-dash/events/page.js"),
    "utf-8"
  );
  const eventsTable = fs.readFileSync(
    path.join(webRoot, "app/[lang]/admin-dash/events/_components/EventsTable.jsx"),
    "utf-8"
  );
  const eventsStats = fs.readFileSync(
    path.join(webRoot, "app/[lang]/admin-dash/events/_components/EventStats.jsx"),
    "utf-8"
  );

  // Page prefetch uses undefined for missing search/status
  assert.ok(eventsPage.includes("search: urlParams?.search"));
  // Table uses empty string "" for missing search/status
  assert.ok(eventsTable.includes('search: searchParams.get("search") || ""'));
  // Stats uses null for missing search/status (from searchParams.get())
  assert.ok(eventsStats.includes('search: searchParams.get("search")'));
});
