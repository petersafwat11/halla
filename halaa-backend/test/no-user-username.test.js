const test = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

// ============================================================================
// ARCHITECTURE GUARD TEST (§4.1)
// ============================================================================
// Enforces that user-domain `username` architecture is completely eradicated.
// The single user identity field is `name`.
// Only narrow, documented exceptions are allowlisted:
//   - External provider basic auth: Moyasar credentials
//   - SMTP transport configuration: EMAIL_USERNAME
//   - Vendor external social handle: instagramUsername / instagramPlaceholder
//   - Migration script: migrate-user-name.js
//   - Explicit unknown-field rejection guards in validation schemas
// ============================================================================

test("PR1R Architecture Guard: No user-domain username across production source", () => {
  const repoRoot = path.resolve(__dirname, "../..");

  // Get all tracked files via git
  const output = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" });
  const allFiles = output.split(/\r?\n/).filter(Boolean);

  const violations = [];

  const codeExtensions = new Set([
    ".js", ".jsx", ".mjs", ".ts", ".tsx"
  ]);

  // Production source directories
  const sourcePrefixes = [
    "halaa-backend/src/",
    "halaa-backend/models/",
    "shared/src/",
    "halaa-web/app/",
    "halaa-web/components/",
    "halaa-web/hooks/",
    "halaa-web/ui/",
    "halaa-mobile/components/",
    "halaa-mobile/screens/",
    "halaa-mobile/hooks/",
    "halaa-mobile/services/",
    "halaa-mobile/utils/",
  ];

  for (const relFile of allFiles) {
    const normalized = relFile.replace(/\\/g, "/");

    // Only scan production source directories
    if (!sourcePrefixes.some((prefix) => normalized.startsWith(prefix))) {
      continue;
    }

    const ext = path.extname(normalized);
    if (!codeExtensions.has(ext)) continue;

    const fullPath = path.join(repoRoot, relFile);
    if (!fs.existsSync(fullPath)) continue;

    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);

    lines.forEach((line, idx) => {
      // Look for case-insensitive 'username'
      if (!/username/i.test(line)) return;

      const trimmed = line.trim();

      // Comments explaining deprecation/architecture are ignored
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
      ) {
        return;
      }

      // Allowlist 1: SMTP transport environment variable
      if (trimmed.includes("EMAIL_USERNAME")) return;

      // Allowlist 2: Moyasar / Basic-auth credentials
      if (
        trimmed.includes("MOYASAR_API_KEY") ||
        trimmed.includes("auth: { username:") ||
        trimmed.includes("Legacy username/password auth")
      ) {
        return;
      }

      // Allowlist 3: External social handle (not user identity)
      if (
        trimmed.includes("instagramUsername") ||
        trimmed.includes("instagramPlaceholder")
      ) {
        return;
      }

      // Allowlist 4: Explicit rejection guards in validation schemas
      if (
        trimmed.includes("Unrecognized field: username") ||
        trimmed.includes("!('username' in") ||
        trimmed.includes("!(\"username\" in") ||
        trimmed.includes("path: ['username']") ||
        trimmed.includes("path: [\"username\"]") ||
        trimmed.includes("data.username === undefined")
      ) {
        return;
      }

      // Allowlist 5: CSS class names
      if (
        trimmed.includes("className={styles.userName}") ||
        trimmed.includes("className={styles.userNameContainer}") ||
        trimmed.startsWith(".userName")
      ) {
        return;
      }

      violations.push({
        file: normalized,
        line: idx + 1,
        content: trimmed,
      });
    });
  }

  if (violations.length > 0) {
    const details = violations
      .map((v) => `  ${v.file}:${v.line} -> ${v.content}`)
      .join("\n");
    assert.fail(
      `Found ${violations.length} forbidden user-domain 'username' occurrences in production source:\n${details}`
    );
  }

  assert.equal(violations.length, 0);
});
