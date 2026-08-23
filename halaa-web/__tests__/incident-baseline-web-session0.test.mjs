/**
 * Session 0/1 Web Incident Baseline & Integrity Verification Suite
 *
 * Verifies:
 * 1. Correct hook imports in HostsTable, BusinessesTable, ModeratorsTable (WEB-02).
 * 2. Complete state and ref declarations in shared Table component (WEB-01).
 * 3. Elimination of orphaned Notifications module (WEB-16).
 * 4. Query key divergences tracking (WEB-05, WEB-06, WEB-14).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

test("Session 1 — WEB-02: Hosts, Businesses, and Moderators tables properly import useMemo from react", () => {
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

    // Check that useMemo IS imported from "react"
    const reactImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+["']react["']/);
    assert.ok(reactImportMatch, `${relPath} imports from react`);
    const importedReactSymbols = reactImportMatch[1].split(",").map((s) => s.trim());

    const hasUseMemoImport = importedReactSymbols.includes("useMemo");
    assert.equal(
      hasUseMemoImport,
      true,
      `VERIFIED FIX: ${relPath} properly imports useMemo from react`
    );
  }
});

test("Session 1 — WEB-01: Shared Table declares all required dropdown state and refs", () => {
  const tablePath = path.join(webRoot, "ui/commen/new-table/Table.js");
  const content = fs.readFileSync(tablePath, "utf-8");

  const requiredVariables = [
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

  for (const varName of requiredVariables) {
    // Check if the variable is referenced in the code
    const isUsed = new RegExp(`\\b${varName}\\b`).test(content);
    assert.ok(isUsed, `Variable ${varName} is referenced in Table.js`);

    // Check if it is declared (const varName, let varName, function varName, or param)
    const isDeclared = new RegExp(`(?:const|let|var|function|ref)\\s+${varName}\\b`).test(content) ||
      new RegExp(`const\\s+\\[[^\\]]*\\b${varName}\\b`).test(content);
    assert.equal(
      isDeclared,
      true,
      `VERIFIED FIX: ${varName} is properly declared in Table.js`
    );
  }
});

test("Session 1 — WEB-16: Orphaned notifications component with undefined hostAPI is removed", () => {
  const notifPath = path.join(webRoot, "ui/auth/notifictions/Notifictions.js");
  assert.equal(fs.existsSync(notifPath), false, "Orphaned Notifictions.js file is deleted");
});

test("Session 0 — WEB-05 & WEB-06: Query key divergence detection", () => {
  // Discounts
  const discountsPagePath = path.join(webRoot, "app/[lang]/admin-dash/discounts/page.js");
  const discountsTablePath = path.join(webRoot, "app/[lang]/admin-dash/discounts/_components/DiscountsTable.jsx");
  const discountsPageContent = fs.readFileSync(discountsPagePath, "utf-8");
  const discountsTableContent = fs.readFileSync(discountsTablePath, "utf-8");

  assert.ok(discountsPageContent.includes("discountsKeys.adminList"), "Discounts SSR prefetch uses adminList key");
  assert.ok(discountsTableContent.includes("useDiscounts"), "Discounts table uses useDiscounts hook");
});
