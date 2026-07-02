/**
 * Durable account-deletion retry worker (DEL-02 · P1-02).
 *
 * Re-runs the outstanding cleanup (residual S3 object deletes) for deletion
 * requests left in `pending_retry` after the initial pass, converging them to
 * `completed` once no personal object remains. Wired into the cron scheduler
 * (scheduledTasks.scheduleAccountDeletionRetry) behind `cronLease.withLease` so
 * multi-node deploys don't double-process. Mirrors the reconcile-tick pattern:
 * a pure, awaitable tick function + a thin cron wrapper elsewhere.
 */

const AccountDeletionRequest = require("../../../models/AccountDeletionRequestModel");
const { retryCleanup } = require("./deletion.service");
const logger = require("../../shared/utils/logger");

const BATCH_LIMIT = Number(process.env.DELETION_RETRY_BATCH || 25);

/**
 * Process one batch of due retries. Never throws (logs + continues).
 * @returns {Promise<{scanned:number, completed:number, stillPending:number}>}
 */
async function runDeletionRetryTick() {
  const now = new Date();
  const due = await AccountDeletionRequest.find({
    status: "pending_retry",
    $or: [{ nextRetryAt: { $lte: now } }, { nextRetryAt: null }],
  })
    .sort({ nextRetryAt: 1 })
    .limit(BATCH_LIMIT);

  let completed = 0;
  let stillPending = 0;
  for (const reqDoc of due) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await retryCleanup(reqDoc);
      if (res.completed) completed += 1;
      else stillPending += 1;
    } catch (err) {
      stillPending += 1;
      logger.warn("[deletion.retry] request retry failed", {
        requestId: reqDoc.requestId,
        error: err.message,
      });
    }
  }

  if (due.length > 0) {
    logger.info("[deletion.retry] tick", {
      scanned: due.length,
      completed,
      stillPending,
    });
  }
  return { scanned: due.length, completed, stillPending };
}

module.exports = { runDeletionRetryTick };
