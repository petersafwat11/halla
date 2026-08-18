/**
 * Account-deletion pipeline (DEL-01/DEL-02 · REVIEW-FINDINGS P1-02 ·
 * LEGAL-PARITY-PLAN §7).
 *
 * Complete, retryable, truthful self-service account deletion. Extracted from
 * users.service so the full model-by-model coverage and the completion state
 * machine are one auditable place with focused tests.
 *
 * Completion semantics (the P1-02 fix):
 *   - account-closed  — sessions revoked + user PII anonymized. MANDATORY, runs
 *                       to completion regardless so the account is always closed.
 *   - request-completed — additionally requires that all personal S3 objects are
 *                       gone and every processor-erasure obligation is recorded.
 *   A failure to delete personal S3 objects (or record processor erasure) yields
 *   `pending_retry` (NOT `completed`): the durable retry worker
 *   (deletion.retry.js, wired into the cron in scheduledTasks) re-runs the S3
 *   deletes until clean and then flips the request to `completed`. This makes a
 *   "completed" claim provably truthful — no undeleted personal file can coexist
 *   with a completed status.
 *
 * Matrix coverage (see docs/evidence/store-readiness/DELETION-MATRIX.md):
 *   delete    : PostEventContent, Service, Ticket, Notification,
 *               NotificationPreferences, RefreshToken, Addon, EventEntitlement,
 *               TermsAcceptance, Block, Report(by/about actor), OTP,
 *               IdempotencyKey, GuestAccessToken/StaffAccessToken (device PII)
 *   anonymize : User (PII $unset), Event (title/location/description/branding +
 *               staffList names/phones), Guest (name/phone/rsvp), Subscription
 *               (free-text), Payment (free-text), RevenueCatEvent (aliases/notes),
 *               AuditLog(ip/ua/actor) — via processor/audit scrub
 *   retain    : Payment/Subscription/AuditLog/BusinessPlanAssignment rows
 *               (pseudonymized), AccountDeletionRequest (audit proof)
 *   processor : RevenueCat (retained_by_policy — DEC-04), Sentry/messaging
 *               (recorded erasure obligation)
 */

const User = require("../../../models/UserModel");
const Event = require("../../../models/EventModel");
const Guest = require("../../../models/GuestModel");
const Notification = require("../../../models/NotificationModel");
const NotificationPreferences = require("../../../models/NotificationPreferencesModel");
const RefreshToken = require("../../../models/RefreshTokenModel");
const Ticket = require("../../../models/TicketModel");
const PostEventContent = require("../../../models/PostEventContentModel");
const Service = require("../../../models/ServiceModel");
const Subscription = require("../../../models/SubscriptionModel");
const Payment = require("../../../models/PaymentModel");
const BusinessPlanAssignment = require("../../../models/BusinessPlanAssignmentModel");
const RevenueCatEvent = require("../../../models/RevenueCatEventModel");
const AuditLog = require("../../../models/AuditLogModel");
const OutboundMessage = require("../../../models/OutboundMessageModel");
const Addon = require("../../../models/AddonModel");
const EventEntitlement = require("../../../models/EventEntitlementModel");
const TermsAcceptance = require("../../../models/TermsAcceptanceModel");
const Block = require("../../../models/BlockModel");
const Report = require("../../../models/ReportModel");
const OTP = require("../../../models/OTPModel");
const IdempotencyKey = require("../../../models/IdempotencyKeyModel");
const GuestAccessToken = require("../../../models/GuestAccessTokenModel");
const StaffAccessToken = require("../../../models/StaffAccessTokenModel");
const AccountDeletionRequest = require("../../../models/AccountDeletionRequestModel");

// Imported as a namespace (not destructured) so `deleteFromS3` is resolved at
// call time — this lets integration tests stub S3 by overriding
// `s3.deleteFromS3` without hitting real S3 (the shared bucket is never touched
// in tests).
const s3 = require("../../shared/utils/s3Upload");
const logger = require("../../shared/utils/logger");
const { logAudit } = require("../../shared/utils/auditLog");
const { RETAINED, LEGAL_FINALIZED } = require("../../shared/constants/dataRetention");
const { USER_STATUS, EVENT_STATUS } = require("../../shared/constants/status");
const { collectS3Keys } = require("./deletion.collect");
const processorErasure = require("./deletion.processors");

/**
 * Delete a single S3 object idempotently. An already-absent object
 * (NoSuchKey / 404) counts as SUCCESS so a retried deletion can converge to
 * `completed` — otherwise a re-run over the residual list would never clear.
 * `deleteFromS3` returns true on a successful DeleteObject (S3 returns 204 even
 * for a missing key). It returns false only when S3 is unconfigured or the SDK
 * call threw (e.g. AccessDenied) — those stay in the residual list for retry.
 * @returns {Promise<boolean>} true if the key is confirmed gone/absent.
 */
async function deleteKeySafe(key) {
  try {
    const ok = await s3.deleteFromS3(key);
    return ok === true;
  } catch (err) {
    logger.warn("[deletion] S3 delete threw", { error: err.message });
    return false;
  }
}

/**
 * Attempt to delete every key in `keys`; return the residual (still-failing)
 * keys. Never throws.
 * @param {string[]} keys
 * @returns {Promise<string[]>} residual keys that were NOT confirmed gone.
 */
async function deleteKeys(keys) {
  const residual = [];
  for (const key of keys) {
    // eslint-disable-next-line no-await-in-loop
    const gone = await deleteKeySafe(key);
    if (!gone) residual.push(key);
  }
  return residual;
}

/**
 * Run the full deletion pipeline for a user. Idempotent + reauth already
 * enforced by the caller.
 * @param {object} opts
 * @param {import("mongoose").Types.ObjectId|string} opts.userId
 * @param {"app"|"web"|"support"} [opts.channel]
 * @returns {Promise<import("mongoose").Document>} the AccountDeletionRequest doc
 */
async function runDeletion({ userId, channel = "app" }) {
  const user = await User.findById(userId);
  const privacyDeletedAt = new Date();
  const latest = await AccountDeletionRequest.findOne({ userId }).sort({
    createdAt: -1,
  });

  // Idempotent: user already anonymized/gone → return the latest request.
  if (!user) {
    if (latest) return latest;
    const err = new Error("User");
    err.statusCode = 404;
    throw err;
  }

  const reqDoc =
    latest && (latest.status === "processing" || latest.status === "pending_retry")
      ? latest
      : await AccountDeletionRequest.create({
          userId,
          channel,
          billingUserId: user.billingUserId || null,
          retainedDisclosure: { retained: RETAINED, legalFinalized: LEGAL_FINALIZED },
        });
  // Ensure the tombstone id is stamped even when reusing an older row.
  if (!reqDoc.billingUserId && user.billingUserId) {
    reqDoc.billingUserId = user.billingUserId;
  }

  const steps = [];
  let mandatoryFailed = false;
  const run = async (name, fn, mandatory = false) => {
    try {
      await fn();
      steps.push({ name, status: "ok", mandatory });
    } catch (err) {
      steps.push({ name, status: "failed", mandatory, error: err.message });
      if (mandatory) mandatoryFailed = true;
      logger.warn(`[deletion] step '${name}' failed`, {
        userId: String(userId),
        error: err.message,
      });
    }
  };

  // Collect ALL owned S3 keys + event ids up-front (reads pre-anonymize).
  let s3Keys = [];
  let eventIds = [];
  await run(
    "collect_assets",
    async () => {
      const collected = await collectS3Keys(user);
      s3Keys = collected.keys;
      eventIds = collected.eventIds;
    },
    true
  );

  // 1) Revoke every active session immediately (mandatory). Already-issued
  //    access JWTs stop working via the UserModel deletedAt pre-find hook +
  //    protect's DELETED branch.
  await run(
    "revoke_sessions",
    async () => {
      await RefreshToken.deleteMany({ userId });
    },
    true
  );

  // 2) Cascade owned events: scrub PII (title/location/description/branding +
  //    staffList names/phones) and soft-delete; anonymize their guests.
  await run(
    "anonymize_events_and_guests",
    async () => {
      if (eventIds.length) {
        await Event.updateMany(
          { _id: { $in: eventIds } },
          {
            $set: {
              status: EVENT_STATUS.DELETED,
              deletedAt: new Date(),
              "eventDetails.title": "Deleted Event",
              // Third-party staff PII on the event doc (names + phones) —
              // previously NOT scrubbed (P1-02). `$[]` scrubs every element.
              "staffList.$[].name": "Deleted",
              "staffList.$[].phone": "",
            },
            $unset: {
              "eventDetails.location": "",
              "eventDetails.description": "",
              branding: "",
            },
          }
        );
        await Guest.updateMany(
          { event: { $in: eventIds } },
          {
            $set: {
              deleted: true,
              deletedAt: new Date(),
              name: "Deleted Guest",
              phone: "",
              "rsvp.message": "",
              "rsvp.dietaryRestrictions": "",
              "checkIn.checkedInByStaff.name": "",
              "checkIn.checkedInByStaff.phone": "",
            },
          }
        );
        // Guest/staff access tokens carry device IP/user-agent PII.
        const guestIds = await Guest.find({ event: { $in: eventIds } })
          .select("_id")
          .lean();
        await GuestAccessToken.deleteMany({
          $or: [
            { event: { $in: eventIds } },
            { guest: { $in: guestIds.map((g) => g._id) } },
          ],
        });
        await StaffAccessToken.deleteMany({ event: { $in: eventIds } });
      }
    },
    true
  );

  // 3) Delete post-event content (media/comments + their images already in the
  //    S3 key set).
  await run(
    "delete_post_event_content",
    async () => {
      await PostEventContent.deleteMany({ host: userId });
    },
    true
  );

  // 4) Delete vendor services (+ images in S3 set).
  await run(
    "delete_vendor_services",
    async () => {
      await Service.deleteMany({ vendorId: userId });
    },
    true
  );

  // 5) Delete support tickets (user-submitted text).
  await run(
    "delete_tickets",
    async () => {
      await Ticket.deleteMany({ user: userId });
    },
    true
  );

  // 6) Notifications + preferences.
  await run(
    "delete_notifications",
    async () => {
      await Notification.deleteMany({ userId });
      await NotificationPreferences.deleteMany({ userId });
    },
    true
  );

  // Provider delivery payloads can contain recipient phone numbers and event
  // context. Delete Halaa's local copies for the account and its events; the
  // provider-side Taqnyat obligation is recorded separately below.
  await run(
    "delete_outbound_message_logs",
    async () => {
      await OutboundMessage.deleteMany({
        $or: [{ user: userId }, ...(eventIds.length ? [{ event: { $in: eventIds } }] : [])],
      });
    },
    true
  );

  // 7) Moderation + UGC-acceptance PII: TermsAcceptance (stores IP), the user's
  //    own Blocks, and Reports the user filed or that name the user as the
  //    reported actor (contain content snapshots / reporter linkage).
  await run(
    "delete_moderation_rows",
    async () => {
      await TermsAcceptance.deleteMany({ actorType: "user", actorId: userId });
      await Block.deleteMany({
        $or: [
          { blockerType: "user", blockerId: userId },
          { blockedActorType: "user", blockedActorId: userId },
        ],
      });
      await Report.deleteMany({
        $or: [
          { reporterType: "user", reporterId: userId },
          { reportedActorType: "user", reportedActorId: userId },
        ],
      });
    },
    true
  );

  // 8) Billing add-on/entitlement rows that are NOT in the retained matrix.
  //    (Payment + Subscription rows are RETAINED, pseudonymized — the user
  //    anonymization below removes the restorable identifiers; the free-text
  //    fields on them are scrubbed here.)
  await run(
    "scrub_billing_freetext",
    async () => {
      // Addon/EventEntitlement are operational, not in RETAINED → delete.
      await Addon.deleteMany({ userId });
      await EventEntitlement.deleteMany({ userId });
      // Retained rows: strip free-text notes/reasons that may hold PII.
      await Subscription.updateMany({ userId }, { $set: { notes: null, cancelReason: null, privacySubjectDeletedAt: privacyDeletedAt } });
      await Payment.updateMany(
        { userId },
        { $set: { description: null, metadata: {}, redirectUrl: null, callbackUrl: null, privacySubjectDeletedAt: privacyDeletedAt } }
      );
      await Payment.updateMany({ userId, "refunds.0": { $exists: true } }, { $unset: { "refunds.$[].reason": "" } });
      await BusinessPlanAssignment.updateMany(
        { businessUserId: userId },
        { $set: { grantReason: null, discountCode: null, tokenHash: null, privacySubjectDeletedAt: privacyDeletedAt } }
      );
      await BusinessPlanAssignment.updateMany(
        { businessUserId: userId, "deliveryAttempts.0": { $exists: true } },
        { $unset: { "deliveryAttempts.$[].error": "" } }
      );
      await RevenueCatEvent.updateMany(
        { userId },
        { $set: { aliases: [], rawPayload: null, error: null, privacySubjectDeletedAt: privacyDeletedAt } }
      );
      await RevenueCatEvent.updateMany(
        { userId, "resolutionHistory.0": { $exists: true } },
        { $unset: { "resolutionHistory.$[].note": "" } }
      );
      // AuditLog intentionally blocks Mongoose updates. Native collection
      // access is used only for this privacy scrub and retains the action/time.
      await AuditLog.collection.updateMany(
        { $or: [{ performedBy: userId }, { targetType: "user", targetId: userId }] },
        { $set: { performedBy: null, changes: {}, metadata: {}, ipAddress: null, userAgent: null, "request.query": null, "error.message": null } }
      );
    },
    true
  );

  // 9) Transient auth/idempotency PII (phone/email on OTP, hashed request
  //    bodies). Best-effort; these also TTL-expire.
  await run(
    "delete_transient_pii",
    async () => {
      await OTP.deleteMany({ userId });
      await IdempotencyKey.deleteMany({ userId });
    },
    true
  );

  // 10) Anonymize PII + close the account (mandatory, always runs). `$unset`
  //     on unique-sparse contact fields avoids unique-index collisions across
  //     deleted accounts. billingUserId is INTENTIONALLY retained (already
  //     copied onto the deletion request as the pseudonymous tombstone key).
  await run(
    "anonymize_user",
    async () => {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            name: "Deleted User",
            status: USER_STATUS.DELETED,
            deletedAt: new Date(),
            deletedBy: userId,
          },
          $unset: {
            email: "",
            mobile: "",
            phoneNumber: "",
            username: "",
            password: "",
            passwordChangedAt: "",
            passwordResetToken: "",
            passwordResetExpires: "",
            emailVerificationCode: "",
            emailVerificationExpires: "",
            avatar: "",
            pushTokens: "",
            "profile.vendorData": "",
            "profile.businessData": "",
            "profile.hostData.bio": "",
            "profile.hostData.company": "",
            "profile.hostData.position": "",
          },
        }
      );
    },
    true
  );

  // 11) Record downstream processor-erasure obligations (RevenueCat kept by
  //     policy — DEC-04; Sentry/messaging recorded for action). Non-blocking:
  //     a failure here contributes to `pending_retry`, not a false completion.
  await run(
    "record_processor_erasure",
    async () => {
      await processorErasure.recordObligations({
        deletionRequestId: reqDoc.requestId,
        userId,
        billingUserId: reqDoc.billingUserId,
      });
    },
    false
  );

  // 12) Delete personal S3 objects. NON-blocking for account CLOSURE but it
  //     GATES a truthful `completed` — residual keys go to pending_retry.
  let residualKeys = [];
  await run(
    "delete_s3_objects",
    async () => {
      residualKeys = await deleteKeys(s3Keys);
      if (residualKeys.length) {
        throw new Error(`${residualKeys.length} S3 object(s) not deleted`);
      }
    },
    false
  );

  // Determine final status. `partial` = a MANDATORY step failed (account may
  // not be fully closed — needs investigation). `pending_retry` = account
  // closed but S3/processor cleanup incomplete (worker will converge).
  const cleanupIncomplete =
    residualKeys.length > 0 ||
    steps.some(
      (s) => !s.mandatory && s.status === "failed"
    );

  reqDoc.steps = steps;
  reqDoc.pendingS3Keys = residualKeys;
  if (mandatoryFailed) {
    reqDoc.status = "partial";
  } else if (cleanupIncomplete) {
    reqDoc.status = "pending_retry";
    reqDoc.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000);
  } else {
    reqDoc.status = "completed";
    reqDoc.completedAt = new Date();
  }
  await reqDoc.save();

  logAudit({
    action: "user.account_deleted",
    actor: { _id: userId, role: user.role },
    targetType: "user",
    targetId: userId,
    metadata: {
      requestId: reqDoc.requestId,
      channel,
      status: reqDoc.status,
      residualS3: residualKeys.length,
    },
    status: mandatoryFailed ? "failure" : "success",
  }).catch(() => {});

  return reqDoc;
}

/**
 * Retry the outstanding cleanup for one deletion request that is in
 * `pending_retry`. Re-attempts residual S3 deletes (idempotent) and flips to
 * `completed` once nothing remains. Called by the durable worker.
 * @param {import("mongoose").Document} reqDoc
 * @returns {Promise<{completed:boolean, residual:number}>}
 */
// After this many failed retries, stop looping and surface the request as a
// terminal `failed` so ops sees a persistent-failure signal (e.g. a systemic S3
// AccessDenied) instead of a silently-growing pending_retry queue. The account
// is already CLOSED; this only concerns residual object cleanup. Read at call
// time so it can be tuned per environment.
const maxDeletionRetries = () => Number(process.env.DELETION_MAX_RETRIES || 12);

async function retryCleanup(reqDoc) {
  const residual = await deleteKeys(reqDoc.pendingS3Keys || []);
  reqDoc.pendingS3Keys = residual;
  reqDoc.retryCount = (reqDoc.retryCount || 0) + 1;
  reqDoc.lastRetryAt = new Date();

  const processorPending = await processorErasure.hasUnresolved(reqDoc.requestId);

  if (residual.length === 0 && !processorPending) {
    reqDoc.status = "completed";
    reqDoc.completedAt = new Date();
    reqDoc.nextRetryAt = null;
    await reqDoc.save();
    return { completed: true, residual: 0 };
  }

  // Persistent failure → terminal `failed` + loud audit so ops investigates a
  // likely systemic cause (e.g. IAM DeleteObject denied). Never a false
  // `completed` — the residual is preserved on the row for manual cleanup.
  if (reqDoc.retryCount >= maxDeletionRetries()) {
    reqDoc.status = "failed";
    reqDoc.nextRetryAt = null;
    await reqDoc.save();
    logAudit({
      action: "user.account_deletion_cleanup_failed",
      actor: { _id: reqDoc.userId, role: "system" },
      targetType: "user",
      targetId: reqDoc.userId,
      metadata: {
        requestId: reqDoc.requestId,
        residualS3: residual.length,
        retryCount: reqDoc.retryCount,
      },
      status: "failure",
    }).catch(() => {});
    logger.error("[deletion.retry] cleanup exhausted retries — manual action needed", {
      requestId: reqDoc.requestId,
      residual: residual.length,
    });
    return { completed: false, residual: residual.length, exhausted: true };
  }

  // Exponential-ish backoff capped at 6h.
  const delayMs = Math.min(
    5 * 60 * 1000 * 2 ** Math.min(reqDoc.retryCount, 7),
    6 * 60 * 60 * 1000
  );
  reqDoc.nextRetryAt = new Date(Date.now() + delayMs);
  await reqDoc.save();
  return { completed: false, residual: residual.length };
}

module.exports = { runDeletion, retryCleanup, deleteKeys, deleteKeySafe };
