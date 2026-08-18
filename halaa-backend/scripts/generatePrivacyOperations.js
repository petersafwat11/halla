#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const sourcePath = path.join(repoRoot, "shared", "src", "legal", "operations.json");
const outputPath = path.join(__dirname, "..", "src", "shared", "legal", "privacyOperations.generated.json");
const evidencePath = path.join(repoRoot, "docs", "evidence", "store-readiness", "generated", "privacy-operations.generated.md");

const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

function build() {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (source.ownerApproval !== "OWNER_APPROVED") throw new Error("privacy operations owner approval missing");
  if (!Array.isArray(source.retentionRules) || source.retentionRules.length !== 5) throw new Error("expected five retention rules");
  const ids = new Set();
  for (const rule of source.retentionRules) {
    if (!rule.id || ids.has(rule.id)) throw new Error(`duplicate/missing retention rule id: ${rule.id}`);
    ids.add(rule.id);
    if (!rule.collection || !rule.model || !rule.triggerField || (!Number.isInteger(rule.durationDays) && !Number.isInteger(rule.durationYears))) {
      throw new Error(`invalid retention rule ${rule.id}`);
    }
    if (!["record_timestamp", "end_of_calendar_year"].includes(rule.retentionAnchor)) {
      throw new Error(`invalid retention anchor for ${rule.id}`);
    }
  }
  const policyHash = crypto.createHash("sha256").update(stable(source)).digest("hex");
  return { ...source, policyHash };
}

function markdown(doc) {
  const lines = [
    "# Privacy operations contract (generated)",
    "",
    "Generated from `shared/src/legal/operations.json`. Do not edit by hand.",
    "",
    `- Policy version: \`${doc.policyVersion}\``,
    `- Owner approval: \`${doc.ownerApproval}\``,
    `- Counsel status: \`${doc.counselStatus}\``,
    `- Policy hash: \`${doc.policyHash}\``,
    "",
    "| Rule | Collection | Trigger | Duration | Action | Legal basis |",
    "|---|---|---|---:|---|---|",
    ...doc.retentionRules.map((r) => `| ${r.id} | ${r.collection} | ${r.triggerField} (${r.retentionAnchor}) | ${r.durationYears ? `${r.durationYears} years` : `${r.durationDays} days`} | ${r.action} | ${r.legalBasis} |`),
    "",
    `Processors inventoried: **${doc.processors.length}**. Fields containing \`*_CONFIRMATION_REQUIRED\` remain external account/contract checks.`,
    "",
  ];
  return lines.join("\n");
}

const generated = build();
const artifacts = [
  { path: outputPath, value: `${JSON.stringify(generated, null, 2)}\n` },
  { path: evidencePath, value: markdown(generated) },
];
const normalize = (v) => v.replace(/\r\n/g, "\n");

if (process.argv.includes("--check")) {
  const drift = artifacts.filter((a) => !fs.existsSync(a.path) || normalize(fs.readFileSync(a.path, "utf8")) !== normalize(a.value));
  if (drift.length) {
    console.error(`privacy operations drift: ${drift.map((a) => path.relative(repoRoot, a.path)).join(", ")}`);
    process.exit(1);
  }
  console.log(`privacy operations in sync (${generated.retentionRules.length} rules, ${generated.processors.length} processors)`);
} else {
  for (const artifact of artifacts) {
    fs.mkdirSync(path.dirname(artifact.path), { recursive: true });
    fs.writeFileSync(artifact.path, artifact.value);
  }
  console.log(`generated privacy operations ${generated.policyHash}`);
}
