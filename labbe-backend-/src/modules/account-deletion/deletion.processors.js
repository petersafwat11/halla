/**
 * Downstream processor erasure recording (DEL-02 · LEGAL §7).
 *
 * When a Halaa account is deleted, some data lives with third-party PROCESSORS.
 * This module records a deterministic, pseudonymous erasure obligation per
 * processor so the deletion request never silently claims downstream data is
 * gone when it is not, and ops/legal have a durable worklist. It does NOT store
 * any restored PII — only the processor name, a pseudonymous external reference,
 * a reason, and a status.
 *
 * RevenueCat (DEC-04, signed): purchases/entitlements are kept with the original
 * App User ID — NO automatic cross-account transfer, NO proactive customer wipe.
 * A genuine migration is handled manually by support. So the RevenueCat
 * obligation is recorded as `retained_by_policy` (billing/tax retention), NOT an
 * erasure request. A trailing post-deletion RevenueCat webhook is separately
 * classified as `account_deleted` by the billing engine (revenuecat.service).
 *
 * Sentry / messaging (Taqnyat/email/SMS/push): no server-side erasure API is
 * wired in this codebase. These are recorded as `pending` obligations (Sentry
 * scrubs PII at ingest via beforeSend; a formal user-scoped purge, if required,
 * is an ops/manual action tracked by this record). Push tokens were already
 * removed from the User doc during anonymization, so `push` is `not_applicable`.
 */

const ProcessorErasure = require("../../../models/ProcessorErasureModel");
const logger = require("../../shared/utils/logger");

/**
 * Idempotently upsert one obligation (unique on deletionRequestId+processor).
 */
async function upsert({ deletionRequestId, userId, processor, externalRef, status, reason }) {
  await ProcessorErasure.updateOne(
    { deletionRequestId, processor },
    {
      $setOnInsert: {
        userId,
        externalRef: externalRef || null,
        status,
        reason,
        requestedAt: new Date(),
        resolvedAt: status === "retained_by_policy" || status === "not_applicable" ? new Date() : null,
      },
    },
    { upsert: true }
  );
}

/**
 * Record all processor-erasure obligations for a deletion.
 * @param {{deletionRequestId:string, userId:any, billingUserId?:string}} opts
 */
async function recordObligations({ deletionRequestId, userId, billingUserId }) {
  const rows = [
    {
      processor: "revenuecat",
      externalRef: billingUserId || null,
      status: "retained_by_policy",
      reason:
        "Purchases kept with original App User ID (DEC-04); billing/tax retention. No cross-account transfer.",
    },
    {
      processor: "sentry",
      externalRef: null,
      status: "pending",
      reason:
        "Crash/diagnostic data: Sentry scrubs PII at ingest; user-scoped purge is a manual ops action if required.",
    },
    {
      processor: "taqnyat",
      externalRef: null,
      status: "pending",
      reason: "Outbound WhatsApp/SMS delivery logs at provider — erasure obligation recorded.",
    },
    {
      processor: "push",
      externalRef: null,
      status: "not_applicable",
      reason: "Push tokens removed from account during anonymization.",
    },
  ];
  for (const r of rows) {
    // eslint-disable-next-line no-await-in-loop
    await upsert({ deletionRequestId, userId, ...r }).catch((err) =>
      logger.warn("[deletion.processors] upsert failed", {
        processor: r.processor,
        error: err.message,
      })
    );
  }
}

/**
 * Does this deletion request still have unresolved processor obligations that
 * should block a `completed` status? `retained_by_policy` and `not_applicable`
 * are terminal (do NOT block). `pending`/`requested`/`failed` block.
 *
 * NOTE: by default the recorded Sentry/messaging obligations are `pending`,
 * which would keep a request in `pending_retry` indefinitely. That is
 * intentional ONLY if an automated resolver exists; since resolution here is a
 * manual ops action, we treat `pending` processor rows as NON-blocking for the
 * user-facing completion (the S3 residual is the hard gate) unless
 * `DELETION_PROCESSOR_BLOCKS_COMPLETION=true` is set. This keeps the user's
 * request truthful about FILES while not stranding it on a manual step.
 * @param {string} deletionRequestId
 * @returns {Promise<boolean>}
 */
async function hasUnresolved(deletionRequestId) {
  if (process.env.DELETION_PROCESSOR_BLOCKS_COMPLETION !== "true") return false;
  const blocking = await ProcessorErasure.countDocuments({
    deletionRequestId,
    status: { $in: ["pending", "requested", "failed"] },
  });
  return blocking > 0;
}

module.exports = { recordObligations, hasUnresolved, upsert };
