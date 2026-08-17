#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../config.env"),
});

const {
  EXPECTED_TEMPLATE_COUNT,
  validateManifest,
  stableManifestHash,
  buildLocalAssignment,
} = require("./lib/ownerTaqnyatTemplateBatch");

const COMMANDS = new Set([
  "validate",
  "dry-run",
  "submit-all",
  "sync-status",
  "retry-failed",
]);
const MAX_SAMPLE_IMAGE_BYTES = 5 * 1024 * 1024;

function usage() {
  return `
Hala owner-template Taqnyat batch

Usage:
  node scripts/submit-owner-taqnyat-templates.js --validate --manifest <file>
  node scripts/submit-owner-taqnyat-templates.js --dry-run --manifest <file> [--output <file>]
  node scripts/submit-owner-taqnyat-templates.js --submit-all --manifest <file> \\
    --sample-header-url <public-https-url> \\
    --confirm-submit-all=14-utility-two-button-templates
  node scripts/submit-owner-taqnyat-templates.js --sync-status --manifest <file>
  node scripts/submit-owner-taqnyat-templates.js --retry-failed --manifest <file> \\
    --confirm-retry-failed=utility-two-button-templates

Options:
  --state <file>                 Submission state file.
  --sample-header-url <url>      Public HTTPS JPG/PNG used for IMAGE-header review.
  --sample-header-handle <url>   Deprecated alias for --sample-header-url.
  --sample-image <file>          Validate a local JPG/PNG for review only.
  --output <file>                Write dry-run payload JSON to a file.

Submit, retry, and status-sync commands also sync the Taqnyat catalogue into
MongoDB and assign Hala category, purpose=invite, invitation mode, and the
seven-variable mapping.
`.trim();
}

function parseArgs(argv) {
  const parsed = { command: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const [rawKey, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    if (COMMANDS.has(rawKey)) {
      if (parsed.command) {
        throw new Error("Choose exactly one command.");
      }
      parsed.command = rawKey;
      continue;
    }

    const booleanKeys = new Set(["help"]);
    if (booleanKeys.has(rawKey)) {
      parsed[rawKey] = true;
      continue;
    }

    const value =
      inlineValue !== undefined ? inlineValue : argv[index + 1];
    if (value === undefined || String(value).startsWith("--")) {
      throw new Error(`--${rawKey} requires a value.`);
    }
    if (inlineValue === undefined) index += 1;
    parsed[rawKey] = value;
  }
  return parsed;
}

function resolvePaths(args) {
  if (!args.manifest) {
    throw new Error("--manifest is required.");
  }
  const manifestPath = path.resolve(process.cwd(), args.manifest);
  const statePath = path.resolve(
    process.cwd(),
    args.state || ".taqnyat-owner-two-button-submission-state.json"
  );
  return { manifestPath, statePath };
}

function readJson(filePath, label) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`${label} could not be read: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try {
    fs.renameSync(temporaryPath, filePath);
  } catch (_error) {
    fs.copyFileSync(temporaryPath, filePath);
    fs.unlinkSync(temporaryPath);
  }
}

function initialState(manifestPath, manifest) {
  return {
    schemaVersion: 1,
    manifestPath,
    manifestHash: stableManifestHash(manifest),
    imageHeaderSampleHandle: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templates: {},
  };
}

function loadState(statePath, manifestPath, manifest) {
  if (!fs.existsSync(statePath)) {
    return initialState(manifestPath, manifest);
  }
  const state = readJson(statePath, "State file");
  const currentHash = stableManifestHash(manifest);
  if (state.manifestHash !== currentHash) {
    throw new Error(
      "The manifest changed after this state file was created. Use a new " +
        "--state path after reviewing the changed manifest."
    );
  }
  state.templates ||= {};
  return state;
}

function saveState(statePath, state) {
  state.updatedAt = new Date().toISOString();
  writeJson(statePath, state);
}

function assertApiConfigured(taqnyat) {
  if (!taqnyat.TAQNYAT_CONFIG.apiKey) {
    throw new Error(
      "TAQNYAT_API_KEY is not configured. Validation and dry-run do not require it."
    );
  }
}

function imageMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  throw new Error("--sample-image must be a JPG, JPEG, or PNG file.");
}

function assertValidSampleImage(imageBuffer, mimeType) {
  if (!imageBuffer.length) {
    throw new Error("--sample-image is empty.");
  }
  if (imageBuffer.length > MAX_SAMPLE_IMAGE_BYTES) {
    throw new Error("--sample-image exceeds Taqnyat's 5 MB image limit.");
  }

  const isJpeg =
    imageBuffer.length >= 3 &&
    imageBuffer[0] === 0xff &&
    imageBuffer[1] === 0xd8 &&
    imageBuffer[2] === 0xff;
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const isPng =
    imageBuffer.length >= pngSignature.length &&
    imageBuffer.subarray(0, pngSignature.length).equals(pngSignature);

  if (
    (mimeType === "image/jpeg" && !isJpeg) ||
    (mimeType === "image/png" && !isPng)
  ) {
    throw new Error(
      "--sample-image content does not match its JPG/PNG extension."
    );
  }
}

function assertPublicHeaderUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch (_error) {
    throw new Error(
      "The IMAGE header sample must be a valid public HTTPS URL."
    );
  }
  if (url.protocol !== "https:") {
    throw new Error(
      "The IMAGE header sample must be a valid public HTTPS URL."
    );
  }
  return url.toString();
}

async function resolveHeaderHandle({
  args,
  manifest,
  state,
  taqnyat,
  uploadAllowed,
}) {
  const explicitHeaderUrl =
    args["sample-header-url"] || args["sample-header-handle"];
  if (explicitHeaderUrl) {
    return assertPublicHeaderUrl(explicitHeaderUrl);
  }
  if (
    state.imageHeaderSampleHandle &&
    /^https:\/\//i.test(state.imageHeaderSampleHandle)
  ) {
    return assertPublicHeaderUrl(state.imageHeaderSampleHandle);
  }
  if (
    manifest.imageHeader?.sampleHandle &&
    /^https:\/\//i.test(manifest.imageHeader.sampleHandle)
  ) {
    return assertPublicHeaderUrl(manifest.imageHeader.sampleHandle);
  }
  if (!args["sample-image"]) return "";

  const imagePath = path.resolve(process.cwd(), args["sample-image"]);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Sample image not found: ${imagePath}`);
  }
  const mimeType = imageMimeType(imagePath);
  const imageBuffer = fs.readFileSync(imagePath);
  assertValidSampleImage(imageBuffer, mimeType);
  if (!uploadAllowed) {
    return "";
  }
  throw new Error(
    "Taqnyat template creation requires a public HTTPS URL for " +
      "header_handle. Pass --sample-header-url; --sample-image is local " +
      "preflight only."
  );
}

function printValidation(result) {
  if (result.valid) {
    console.log(
      `Validation passed: ${result.records.length} UTILITY templates, ` +
        "all with IMAGE headers and seven body variables."
    );
    return;
  }
  console.error(`Validation failed with ${result.errors.length} error(s):`);
  result.errors.forEach((error) => console.error(`- ${error}`));
}

function upstreamTemplateIndex(templates) {
  return new Map(
    (templates || [])
      .filter((template) => template?.name)
      .map((template) => [template.name, template])
  );
}

function updateStateFromUpstream(state, records, upstream) {
  const index = upstreamTemplateIndex(upstream);
  let matched = 0;
  for (const record of records) {
    const template = index.get(record.name);
    if (!template) continue;
    matched += 1;
    state.templates[record.name] = {
      ...(state.templates[record.name] || {}),
      success: true,
      templateId: String(template.id || template.template_id || record.name),
      status: String(template.status || "UNKNOWN").toUpperCase(),
      syncedAt: new Date().toISOString(),
    };
  }
  return matched;
}

function safeFailure(result) {
  return {
    success: false,
    error: String(result?.error || "Unknown Taqnyat error").slice(0, 1000),
    code:
      result?.code === undefined || result?.code === null
        ? null
        : String(result.code),
    attemptedAt: new Date().toISOString(),
  };
}

async function fetchUpstream(taqnyat) {
  const result = await taqnyat.getTemplates();
  if (!result.success) {
    throw new Error(
      `Taqnyat template sync failed: ${result.error || "unknown error"}`
    );
  }
  return result.templates || [];
}

async function submitRecords({
  records,
  state,
  statePath,
  taqnyat,
  retryOnly,
  upstream,
}) {
  const upstreamIndex = upstreamTemplateIndex(upstream);
  const conflicts = [];

  if (!retryOnly) {
    for (const record of records) {
      const knownSuccess = state.templates[record.name]?.success === true;
      if (upstreamIndex.has(record.name) && !knownSuccess) {
        conflicts.push(record.name);
      }
    }
  }
  if (conflicts.length > 0) {
    throw new Error(
      "Upstream templates already use planned names but are not recorded in " +
        `this state file: ${conflicts.join(", ")}. Run --sync-status first.`
    );
  }

  let submitted = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records) {
    const previous = state.templates[record.name];
    const existing = upstreamIndex.get(record.name);

    if (existing) {
      state.templates[record.name] = {
        ...(previous || {}),
        success: true,
        templateId: String(existing.id || existing.template_id || record.name),
        status: String(existing.status || "UNKNOWN").toUpperCase(),
        syncedAt: new Date().toISOString(),
      };
      saveState(statePath, state);
      skipped += 1;
      continue;
    }
    if (previous?.success === true) {
      skipped += 1;
      continue;
    }
    if (retryOnly && previous && previous.success !== false) {
      skipped += 1;
      continue;
    }

    console.log(`[${record.name}] submitting`);
    const result = await taqnyat.createTemplate(
      record.payload.name,
      record.payload.category,
      record.payload.language,
      record.payload.components,
      { allowCategoryChange: false }
    );

    if (result.success) {
      state.templates[record.name] = {
        success: true,
        templateId: String(result.templateId || record.name),
        status: String(result.status || "PENDING").toUpperCase(),
        submittedAt: new Date().toISOString(),
      };
      submitted += 1;
      console.log(`[${record.name}] submitted (${state.templates[record.name].status})`);
    } else {
      state.templates[record.name] = safeFailure(result);
      failed += 1;
      console.error(`[${record.name}] failed: ${state.templates[record.name].error}`);
    }
    saveState(statePath, state);
  }

  return { submitted, skipped, failed };
}

async function syncAndAssignLocalCatalog({ records, state, statePath }) {
  const { connectDB, disconnectDB } = require("../src/config/database");
  const taqnyatTemplatesService = require(
    "../src/modules/taqnyat-templates/taqnyat-templates.service"
  );

  await connectDB();
  try {
    const syncResult = await taqnyatTemplatesService.syncFromTaqnyat();
    const byName = new Map(
      (syncResult.upserted || []).map((template) => [
        template.templateName,
        template,
      ])
    );
    const missing = [];
    let assigned = 0;

    for (const [index, record] of records.entries()) {
      const localTemplate = byName.get(record.name);
      if (!localTemplate) {
        missing.push(record.name);
        continue;
      }

      const assignedTemplate = await taqnyatTemplatesService.assignMapping(
        localTemplate._id,
        buildLocalAssignment(record, index)
      );
      state.templates[record.name] = {
        ...(state.templates[record.name] || {}),
        localTemplateId: String(assignedTemplate._id),
        localAssignedAt: new Date().toISOString(),
      };
      saveState(statePath, state);
      assigned += 1;
    }

    return {
      assigned,
      missing,
      upstreamCount: syncResult.count || 0,
    };
  } finally {
    await disconnectDB();
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (args.help || !args.command) {
    console.log(usage());
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const { manifestPath, statePath } = resolvePaths(args);
  const manifest = readJson(manifestPath, "Manifest");
  const state = loadState(statePath, manifestPath, manifest);

  const isSubmit =
    args.command === "submit-all" || args.command === "retry-failed";
  let taqnyat = null;
  if (isSubmit || args.command === "sync-status") {
    taqnyat = require("../src/infrastructure/taqnyat");
    assertApiConfigured(taqnyat);
  }

  if (
    args.command === "submit-all" &&
    args["confirm-submit-all"] !== "14-utility-two-button-templates"
  ) {
    throw new Error(
      "--submit-all requires --confirm-submit-all=14-utility-two-button-templates."
    );
  }
  if (
    args.command === "retry-failed" &&
    args["confirm-retry-failed"] !== "utility-two-button-templates"
  ) {
    throw new Error(
      "--retry-failed requires --confirm-retry-failed=utility-two-button-templates."
    );
  }

  const previewHeaderHandle = await resolveHeaderHandle({
    args,
    manifest,
    state,
    taqnyat,
    uploadAllowed: false,
  });
  let validation = validateManifest(manifest, {
    headerHandle: previewHeaderHandle,
  });
  printValidation(validation);
  if (!validation.valid) {
    process.exitCode = 1;
    return;
  }

  if (args.command === "validate") return;

  if (args.command === "dry-run") {
    const output = {
      manifestHash: validation.manifestHash,
      templateCount: validation.records.length,
      templates: validation.records,
    };
    if (args.output) {
      const outputPath = path.resolve(process.cwd(), args.output);
      writeJson(outputPath, output);
      console.log(`Dry-run payloads written to ${outputPath}`);
    } else {
      console.log(JSON.stringify(output, null, 2));
    }
    return;
  }

  const upstream = await fetchUpstream(taqnyat);
  if (args.command === "sync-status") {
    const matched = updateStateFromUpstream(
      state,
      validation.records,
      upstream
    );
    saveState(statePath, state);
    const local = await syncAndAssignLocalCatalog({
      records: validation.records,
      state,
      statePath,
    });
    console.log(
      `Status sync complete: ${matched}/${EXPECTED_TEMPLATE_COUNT} planned templates found upstream; ` +
        `${local.assigned}/${EXPECTED_TEMPLATE_COUNT} assigned in Hala.`
    );
    if (local.missing.length > 0) {
      console.error(
        `Missing upstream/local templates: ${local.missing.join(", ")}`
      );
      process.exitCode = 1;
    }
    return;
  }

  // Uploading sample media is an upstream mutation. Do it only after the
  // manifest, confirmation token, and upstream-name preflight have passed.
  if (args.command === "submit-all") {
    const upstreamIndex = upstreamTemplateIndex(upstream);
    const conflicts = validation.records
      .filter(
        (record) =>
          upstreamIndex.has(record.name) &&
          state.templates[record.name]?.success !== true
      )
      .map((record) => record.name);
    if (conflicts.length > 0) {
      throw new Error(
        "Upstream templates already use planned names but are not recorded in " +
          `this state file: ${conflicts.join(", ")}. Run --sync-status first.`
      );
    }
  }

  const headerHandle = await resolveHeaderHandle({
    args,
    manifest,
    state,
    taqnyat,
    uploadAllowed: true,
  });
  state.imageHeaderSampleHandle = headerHandle;
  saveState(statePath, state);

  validation = validateManifest(manifest, { headerHandle });
  if (!validation.valid) {
    printValidation(validation);
    process.exitCode = 1;
    return;
  }

  const summary = await submitRecords({
    records: validation.records,
    state,
    statePath,
    taqnyat,
    retryOnly: args.command === "retry-failed",
    upstream,
  });

  const afterSubmit = await fetchUpstream(taqnyat);
  updateStateFromUpstream(state, validation.records, afterSubmit);
  saveState(statePath, state);
  const local = await syncAndAssignLocalCatalog({
    records: validation.records,
    state,
    statePath,
  });

  console.log(
    `Batch complete: ${summary.submitted} submitted, ${summary.skipped} skipped, ` +
      `${summary.failed} failed; ${local.assigned}/${EXPECTED_TEMPLATE_COUNT} ` +
      `assigned in Hala. State: ${statePath}`
  );
  if (summary.failed > 0 || local.missing.length > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Fatal: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  resolveHeaderHandle,
  updateStateFromUpstream,
  submitRecords,
  syncAndAssignLocalCatalog,
  assertValidSampleImage,
  assertPublicHeaderUrl,
};
