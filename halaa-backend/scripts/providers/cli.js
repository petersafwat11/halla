#!/usr/bin/env node
const path = require("node:path");
const { buildDesiredState, OUTPUT_ROOT } = require("./lib/desiredState");
const { writeJson, writeText, readJson } = require("./lib/files");
const { buildPreflight } = require("./lib/preflight");
const { diffProvider } = require("./lib/diff");
const { buildProviderPlan } = require("./lib/providerPlans");
const { verifyPlan } = require("./lib/plan");
const { buildApplePricePointReview, exportApple } = require("./providers/apple");
const { exportGoogle, readGoogleRegionsVersion } = require("./providers/google");
const { exportRevenueCat } = require("./providers/revenuecat");
const { applyRevenueCatPlan } = require("./providers/revenuecatApply");
const { applyGooglePlan } = require("./providers/googleApply");
const { applyApplePlan } = require("./providers/appleApply");

function parseArguments(argv) {
  const flags = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }
    const [name, inlineValue] = argument.slice(2).split("=", 2);
    if (inlineValue != null) flags[name] = inlineValue;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) flags[name] = argv[++index];
    else flags[name] = true;
  }
  return { command: positionals[0] || "plan", flags };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function markdownCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function approvalReviewMarkdown(review) {
  const rows = review.products.map((product) => {
    const en = product.localizations.find((item) => item.locale === "en-US");
    const ar = product.localizations.find((item) => item.locale === "ar-SA");
    const type = product.type === "AUTO_RENEWABLE_SUBSCRIPTION" ? "Subscription" : "Consumable";
    return `| ${[
      product.code,
      type,
      product.targetPriceSar,
      product.proposedSubscriptionLevel,
      en.name,
      en.description,
      ar.name,
      ar.description,
    ].map(markdownCell).join(" | ")} |`;
  });
  return [
    "# Provider Product Approval Review",
    "",
    `Status: **${review.status}**  `,
    `External writes performed: **${review.externalWrites}**`,
    "",
    "Approve the target SAR amounts, proposed Apple subscription levels, and exact AR/EN copy below. Approval does not create products.",
    "",
    "Apple price-point IDs are product-specific and will be resolved from the Saudi storefront only after separately approved immutable product shells exist. Those IDs require a second review before prices are applied.",
    "",
    `Subscription-level rule: ${review.subscriptionLevelSemantics}.`,
    "",
    `Safety check: ${review.subscriptionGroupRisk}`,
    "",
    "| Code | Type | SAR | Apple level | EN name | EN description | AR name | AR description |",
    "|---|---:|---:|---:|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

function applePriceReviewMarkdown(review) {
  return [
    "# Apple Saudi Price-Point Approval Review",
    "",
    `Mode: **${review.mode}**  `,
    `External writes: **${review.externalWrites}**  `,
    `Exact matches: **${review.summary.exactMatches}/${review.summary.products}**`,
    "",
    "Approving this sheet authorizes the listed product-specific Apple price-point IDs. It does not submit the app or products for review.",
    "",
    "For rows without an exact match, the recommended option is the mathematically nearest Apple price point. Both surrounding options remain in the JSON artifact.",
    "",
    "| Code | Target SAR | Recommended Apple price | Difference | Recommended price-point ID | Status |",
    "|---|---:|---:|---:|---|---|",
    ...review.products.map((product) =>
      `| ${[
        product.code,
        product.targetAmount,
        product.recommendedCustomerPrice,
        product.differenceFromTarget,
        product.recommendedPricePointId,
        product.status,
      ].map(markdownCell).join(" | ")} |`,
    ),
    "",
  ].join("\n");
}

function generate(desiredState) {
  writeJson(path.join(OUTPUT_ROOT, "desired-state.generated.json"), desiredState);
  writeJson(path.join(OUTPUT_ROOT, "apple.generated.json"), desiredState.apple);
  writeJson(path.join(OUTPUT_ROOT, "google.generated.json"), desiredState.google);
  writeJson(path.join(OUTPUT_ROOT, "revenuecat.generated.json"), desiredState.revenueCat);
  writeJson(path.join(OUTPUT_ROOT, "provider-approvals.template.json"), desiredState.approvalTemplate);
  writeJson(path.join(OUTPUT_ROOT, "provider-approval-review.generated.json"), desiredState.approvalReview);
  writeText(
    path.join(OUTPUT_ROOT, "provider-approval-review.generated.md"),
    approvalReviewMarkdown(desiredState.approvalReview),
  );
  return {
    outputRoot: OUTPUT_ROOT,
    files: [
      "desired-state.generated.json",
      "apple.generated.json",
      "google.generated.json",
      "revenuecat.generated.json",
      "provider-approvals.template.json",
      "provider-approval-review.generated.json",
      "provider-approval-review.generated.md",
    ],
  };
}

function plan(desiredState, provider, actualPath, stage = "full") {
  const providers = provider === "all" ? ["apple", "google", "revenueCat"] : [provider];
  if (actualPath && providers.length !== 1) throw new Error("--actual requires one --provider");
  const actual = actualPath ? readJson(path.resolve(actualPath)) : null;
  const plans = providers.map((name) => buildProviderPlan(desiredState, name, actual, { stage }));
  for (const item of plans) {
    const suffix = item.stage && item.stage !== "full" ? `-${item.stage}` : "";
    writeJson(path.join(OUTPUT_ROOT, `${item.provider}${suffix}-plan.generated.json`), item);
  }
  return {
    mode: "DRY_RUN",
    externalWrites: 0,
    source: desiredState.source,
    providers: plans.map((item) => {
      const suffix = item.stage && item.stage !== "full" ? `-${item.stage}` : "";
      return {
        provider: item.provider,
        stage: item.stage,
        operations: item.operations.length,
        deferred: (item.deferred || []).length,
        blockers: item.blockers,
        conflicts: item.conflicts.length,
        planHash: item.planHash,
        output: path.join(OUTPUT_ROOT, `${item.provider}${suffix}-plan.generated.json`),
      };
    }),
  };
}

async function exportProvider(provider, outputPath) {
  const exporters = {
    apple: exportApple,
    google: exportGoogle,
    revenueCat: exportRevenueCat,
  };
  if (!exporters[provider]) throw new Error("export requires --provider apple|google|revenueCat");
  const result = await exporters[provider]();
  const destination = outputPath
    ? path.resolve(outputPath)
    : path.join(
        OUTPUT_ROOT,
        "..",
        "provider-after",
        `${provider}-export.json`,
      );
  writeJson(destination, result);
  return { mode: "READ_ONLY_EXPORT", provider, destination };
}

async function main() {
  const { command, flags } = parseArguments(process.argv.slice(2));
  const providerInput = flags.provider || "all";
  const provider = providerInput.toLowerCase() === "revenuecat" ? "revenueCat" : providerInput;
  const approvalsPath = flags.approvals || process.env.PROVIDER_APPROVALS_PATH;
  const approvals = approvalsPath ? readJson(path.resolve(approvalsPath)) : null;
  const desiredState = buildDesiredState({
    appleAppId: process.env.APPLE_APP_ID,
    revenueCatProjectId: process.env.REVENUECAT_PROJECT_ID,
    googleRegionsVersion: process.env.GOOGLE_REGIONS_VERSION,
    approvals,
  });

  if (command === "record-price-approvals") {
    if (!approvals) throw new Error("record-price-approvals requires --approvals <approved-copy-levels.json>");
    if (!flags.review) throw new Error("record-price-approvals requires --review <price-review.json>");
    if (!flags.output) throw new Error("record-price-approvals requires --output <approval-overlay.json>");
    const review = readJson(path.resolve(flags.review));
    if (review.catalogHash !== desiredState.source.catalogHash) {
      throw new Error("price review catalogHash does not match the frozen catalog");
    }
    const candidates = review.products.filter((product) => product.recommendedPricePointId);
    const approvedCount = Number(flags["approve-count"]);
    if (!Number.isInteger(approvedCount) || approvedCount !== candidates.length) {
      throw new Error(`record-price-approvals requires --approve-count ${candidates.length}`);
    }
    const overlay = structuredClone(approvals);
    overlay.apple.pricePointIds = Object.fromEntries(
      candidates.map((product) => [product.productId, product.recommendedPricePointId]),
    );
    overlay.approvalEvidence = {
      ...(overlay.approvalEvidence || {}),
      applePricesApprovedAt: new Date().toISOString(),
      applePriceReviewCount: candidates.length,
      deferredProductIds: review.products
        .filter((product) => !product.recommendedPricePointId)
        .map((product) => product.productId),
    };
    const output = path.resolve(flags.output);
    writeJson(output, overlay);
    return print({
      mode: "LOCAL_APPROVAL_RECORD",
      externalWrites: 0,
      approvedPricePoints: candidates.length,
      deferredPricePoints: review.products.length - candidates.length,
      output,
    });
  }

  if (command === "generate") return print(generate(desiredState));
  if (command === "preflight") return print(buildPreflight(desiredState));
  if (command === "plan" || flags["dry-run"])
    return print(plan(desiredState, provider, flags.actual, flags.stage || "full"));
  if (command === "verify-plan") {
    if (!flags.plan) throw new Error("verify-plan requires --plan <plan.json>");
    const candidate = readJson(path.resolve(flags.plan));
    const valid = verifyPlan(candidate);
    print({ valid, provider: candidate.provider || null, planHash: candidate.planHash || null });
    process.exitCode = valid ? 0 : 2;
    return;
  }
  if (command === "export") return print(await exportProvider(provider, flags.output));
  if (command === "regions-version") {
    if (provider !== "google") throw new Error("regions-version requires --provider google");
    return print(await readGoogleRegionsVersion());
  }
  if (command === "price-review") {
    if (provider !== "apple") throw new Error("price-review currently requires --provider apple");
    const review = await buildApplePricePointReview(desiredState);
    const jsonPath = path.join(OUTPUT_ROOT, "apple-price-point-review.generated.json");
    const markdownPath = path.join(OUTPUT_ROOT, "apple-price-point-review.generated.md");
    writeJson(jsonPath, review);
    writeText(markdownPath, applePriceReviewMarkdown(review));
    print({
      mode: review.mode,
      externalWrites: review.externalWrites,
      summary: review.summary,
      jsonPath,
      markdownPath,
    });
    process.exitCode = review.summary.unresolved === 0 ? 0 : 2;
    return;
  }
  if (command === "diff") {
    if (!flags.actual) throw new Error("diff requires --actual <normalized-export.json>");
    if (provider === "all") throw new Error("diff requires one --provider");
    const result = diffProvider(desiredState, readJson(path.resolve(flags.actual)), provider);
    print(result);
    process.exitCode = result.clean ? 0 : 2;
    return;
  }
  if (["apply", "resume"].includes(command) || flags.apply || flags.resume) {
    if (provider === "all") throw new Error("apply/resume requires one --provider");
    if (!flags.plan) throw new Error("apply/resume requires --plan <reviewed-plan.json>");
    const reviewedPlan = readJson(path.resolve(flags.plan));
    if (!verifyPlan(reviewedPlan)) throw new Error("reviewed plan hash is invalid");
    if (reviewedPlan.provider !== provider) throw new Error("reviewed plan provider does not match --provider");
    if (reviewedPlan.source.catalogHash !== desiredState.source.catalogHash) {
      throw new Error("catalog changed after plan generation; regenerate the plan");
    }
    if ((flags.stage || reviewedPlan.stage || "full") !== (reviewedPlan.stage || "full")) {
      throw new Error("apply/resume stage does not match the reviewed plan");
    }
    if (flags["approve-plan-hash"] !== reviewedPlan.planHash) {
      throw new Error("apply/resume requires --approve-plan-hash equal to the reviewed plan hash");
    }
    if (reviewedPlan.actualStateBasis !== "READ_ONLY_EXPORT" || !reviewedPlan.actualStateHash) {
      throw new Error("apply/resume requires a plan generated from a read-only provider export");
    }
    if (reviewedPlan.blockers.length || reviewedPlan.conflicts.length) {
      throw new Error("reviewed plan still has blockers or conflicts; no external write was attempted");
    }
    const journalPath = flags.journal || path.join(
      OUTPUT_ROOT,
      "..",
      "provider-after",
      `${provider}-apply-journal.jsonl`,
    );
    const applyOptions = {
      journalPath,
      resume: command === "resume" || Boolean(flags.resume),
    };
    if (provider === "revenueCat") {
      return print(await applyRevenueCatPlan(reviewedPlan, desiredState, applyOptions));
    }
    if (provider === "google") {
      return print(await applyGooglePlan(reviewedPlan, desiredState, applyOptions));
    }
    if (
      provider === "apple" &&
      ["shells", "prices", "availability", "localization", "iap_availability"].includes(reviewedPlan.stage)
    ) {
      return print(await applyApplePlan(reviewedPlan, desiredState, applyOptions));
    }
    throw new Error(`${provider} apply remains fail-closed for stage ${reviewedPlan.stage || "full"}`);
  }
  throw new Error(`Unknown command: ${command}`);
}

try {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
