import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

// --------------------------------------------------------------------------
// PR2R Section 4.6: Repository Architecture Enforcement Guard Test
// Scans tracked JS/JSX/TS/TSX source and fails on application-owned:
// - new Intl.DateTimeFormat and new Intl.NumberFormat
// - .toLocaleDateString(, .toLocaleTimeString(, and display-oriented .toLocaleString(
// - deleted formatter imports/exports: formatEventDate, parseCivilDate,
//   formatTemplateDate, localizeDigits
// --------------------------------------------------------------------------

const BANNED_PATTERNS = [
  {
    name: "new Intl.DateTimeFormat",
    regex: /new\s+Intl\.DateTimeFormat\b/,
    description: "Forbidden raw Intl.DateTimeFormat constructor. Use canonical @halaa/shared/utils/locale formatters.",
  },
  {
    name: "new Intl.NumberFormat",
    regex: /new\s+Intl\.NumberFormat\b/,
    description: "Forbidden raw Intl.NumberFormat constructor. Use canonical @halaa/shared/utils/locale formatters.",
  },
  {
    name: ".toLocaleDateString(",
    regex: /\.toLocaleDateString\s*\(/,
    description: "Forbidden .toLocaleDateString(). Use canonical formatDate from @halaa/shared/utils/locale.",
  },
  {
    name: ".toLocaleTimeString(",
    regex: /\.toLocaleTimeString\s*\(/,
    description: "Forbidden .toLocaleTimeString(). Use canonical formatTime from @halaa/shared/utils/locale.",
  },
  {
    name: ".toLocaleString(",
    regex: /\.toLocaleString\s*\(/,
    description: "Forbidden .toLocaleString(). Use canonical formatters from @halaa/shared/utils/locale.",
  },
  {
    name: "deleted export: formatEventDate",
    regex: /\bformatEventDate\b/,
    description: "formatEventDate is deleted. Use canonical formatDate from @halaa/shared/utils/locale.",
  },
  {
    name: "deleted export: parseCivilDate",
    regex: /\bparseCivilDate\b/,
    description: "parseCivilDate is deleted. Canonical formatDate handles bare YYYY-MM-DD civil dates directly.",
  },
  {
    name: "deleted export: formatTemplateDate",
    regex: /\bformatTemplateDate\b/,
    description: "formatTemplateDate is deleted. Use canonical formatDate from @halaa/shared/utils/locale.",
  },
  {
    name: "deleted export: localizeDigits",
    regex: /\blocalizeDigits\b/,
    description: "localizeDigits is deleted. Use normalizeDigits for input normalization and canonical formatters for display.",
  },
];

const ALLOWLISTED_FILES = new Set([
  path.normalize("shared/src/utils/locale.js"),
  path.normalize("shared/test/no-raw-formatting.test.js"),
  path.normalize("halaa-mobile/eslint.config.mjs"),
  path.normalize("halaa-web/eslint.config.mjs"),
]);

test("PR2R Architecture Enforcement: No raw Intl, toLocale*, or deleted exports in application code", () => {
  const trackedFilesOutput = execFileSync(
    "git",
    ["ls-files", "shared", "halaa-mobile", "halaa-backend", "halaa-web"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  const codeFiles = trackedFilesOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (relPath) =>
        relPath &&
        /\.(jsx?|tsx?|mjs|cjs)$/.test(relPath) &&
        !relPath.includes("node_modules") &&
        !relPath.includes(".next") &&
        !relPath.includes("coverage")
    );

  const violations = [];

  for (const relPath of codeFiles) {
    const normalizedRelPath = path.normalize(relPath);
    if (ALLOWLISTED_FILES.has(normalizedRelPath)) {
      continue;
    }

    const fullPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(fullPath)) continue;

    const fileContent = fs.readFileSync(fullPath, "utf8");
    const lines = fileContent.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("assert.ok(!")) {
        continue;
      }

      for (const pattern of BANNED_PATTERNS) {
        if (pattern.regex.test(line)) {
          violations.push({
            file: relPath,
            line: i + 1,
            rule: pattern.name,
            snippet: line.trim(),
            description: pattern.description,
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    const errorReport = violations
      .map(
        (v) =>
          `  [VIOLATION] ${v.file}:${v.line} -> ${v.rule}\n` +
          `    Snippet: "${v.snippet}"\n` +
          `    Reason: ${v.description}`
      )
      .join("\n\n");

    assert.fail(
      `Found ${violations.length} architecture violation(s) across application code:\n\n${errorReport}\n`
    );
  }

  assert.ok(
    codeFiles.length > 50,
    `Sanity check: scanned ${codeFiles.length} tracked source files.`
  );
});
