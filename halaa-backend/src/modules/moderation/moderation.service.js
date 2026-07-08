/**
 * UGC moderation service (SHIP §6).
 *
 * Versioned policy acceptance, content reports, actor blocking, a staffed
 * moderation queue with actions (hide/remove/warn/suspend/approve/dismiss), and
 * host approve/reject of pending guest comments. The read paths (post-event,
 * vendor) filter against blocks + hidden content so blocked/removed content
 * disappears promptly.
 */

const TermsAcceptance = require("../../../models/TermsAcceptanceModel");
const Report = require("../../../models/ReportModel");
const Block = require("../../../models/BlockModel");
const PostEventContent = require("../../../models/PostEventContentModel");
const User = require("../../../models/UserModel");
const Service = require("../../../models/ServiceModel");
const Notification = require("../../../models/NotificationModel");
const {
  POLICY_VERSIONS,
  POLICY_URLS,
  UGC_REQUIRED_POLICIES,
} = require("../../shared/constants/policies");
const { USER_STATUS } = require("../../shared/constants/status");
const { AppError, ValidationError } = require("../../shared/errors");
const { containsProhibited } = require("../../shared/utils/contentFilter");
const { logAudit } = require("../../shared/utils/auditLog");
const logger = require("../../shared/utils/logger");

const SLA_HOURS = Number(process.env.MODERATION_SLA_HOURS || 48);

class ModerationService {
  // ── Policy acceptance ────────────────────────────────────────────────────
  async getPolicyStatus(actorType, actorId) {
    const rows = await TermsAcceptance.find({ actorType, actorId }).lean();
    const accepted = {};
    for (const r of rows) {
      accepted[r.documentType] = accepted[r.documentType] || [];
      accepted[r.documentType].push(r.version);
    }
    const required = UGC_REQUIRED_POLICIES.map((doc) => ({
      documentType: doc,
      version: POLICY_VERSIONS[doc],
      urls: POLICY_URLS[doc],
      accepted: (accepted[doc] || []).includes(POLICY_VERSIONS[doc]),
    }));
    return {
      required,
      ugcAllowed: required.every((r) => r.accepted),
      versions: POLICY_VERSIONS,
    };
  }

  async acceptPolicies(actorType, actorId, { documents, locale = "ar", ip } = {}) {
    const docs =
      Array.isArray(documents) && documents.length
        ? documents
        : UGC_REQUIRED_POLICIES;
    for (const documentType of docs) {
      const version = POLICY_VERSIONS[documentType];
      if (!version) continue;
      await TermsAcceptance.updateOne(
        { actorType, actorId, documentType, version },
        { $setOnInsert: { locale, ip, acceptedAt: new Date() } },
        { upsert: true }
      );
    }
    return this.getPolicyStatus(actorType, actorId);
  }

  /**
   * Throws 403 UGC_TERMS_REQUIRED if the actor hasn't accepted current terms.
   *
   * DEPLOY-SEQUENCING SAFETY (§6): hard enforcement is gated behind
   * `UGC_TERMS_ENFORCED=true` and defaults OFF. Older clients in the wild don't
   * call the accept endpoint, so enforcing on backend deploy would 403 their
   * comment/upload flows. Ship the backend with the flag OFF, release the new
   * web+mobile builds (which record acceptance), then flip the flag ON once
   * those builds are the live minimum. Acceptance is still RECORDED whenever a
   * client calls /accept regardless of this flag.
   */
  async assertUgcTermsAccepted(actorType, actorId) {
    if (process.env.UGC_TERMS_ENFORCED !== "true") return;
    const status = await this.getPolicyStatus(actorType, actorId);
    if (!status.ugcAllowed) {
      const err = new AppError(
        "You must accept the latest Terms and Community Rules before posting",
        403
      );
      err.code = "UGC_TERMS_REQUIRED";
      err.details = { required: status.required };
      throw err;
    }
  }

  // ── Text filtering ───────────────────────────────────────────────────────
  /** Throws 400 PROHIBITED_CONTENT when text contains prohibited terms. */
  assertCleanText(text) {
    const { blocked } = containsProhibited(text);
    if (blocked) {
      const err = new ValidationError(
        "Your message contains content that isn't allowed"
      );
      err.code = "PROHIBITED_CONTENT";
      throw err;
    }
  }

  // ── Blocking ─────────────────────────────────────────────────────────────
  async block(blockerType, blockerId, { blockedActorType, blockedActorId, contextEventId }) {
    if (
      blockerType === blockedActorType &&
      String(blockerId) === String(blockedActorId)
    ) {
      throw new ValidationError("You can't block yourself");
    }
    await Block.updateOne(
      { blockerType, blockerId, blockedActorType, blockedActorId },
      { $setOnInsert: { contextEventId } },
      { upsert: true }
    );
    return { blocked: true };
  }

  async unblock(blockerType, blockerId, { blockedActorType, blockedActorId }) {
    await Block.deleteOne({
      blockerType,
      blockerId,
      blockedActorType,
      blockedActorId,
    });
    return { blocked: false };
  }

  async listBlocks(blockerType, blockerId) {
    const rows = await Block.find({ blockerType, blockerId })
      .select("blockedActorType blockedActorId createdAt")
      .lean();
    return rows;
  }

  /**
   * Returns a Set of "type:id" keys the viewer has blocked, for fast read-path
   * filtering. Empty set when no viewer (anonymous).
   */
  async getBlockedKeySet(blockerType, blockerId) {
    if (!blockerType || !blockerId) return new Set();
    const rows = await Block.find({ blockerType, blockerId })
      .select("blockedActorType blockedActorId")
      .lean();
    return new Set(rows.map((r) => `${r.blockedActorType}:${r.blockedActorId}`));
  }

  // ── Reporting ────────────────────────────────────────────────────────────
  async createReport({
    reporterType,
    reporterId,
    targetType,
    targetId,
    reportedActorType,
    reportedActorId,
    contextEventId,
    reason,
    details,
    snapshot = {},
  }) {
    const hash = Report.hashContent(snapshot.text || "", snapshot.mediaUrl || "");
    const report = await Report.create({
      reporterType,
      reporterId,
      targetType,
      targetId,
      reportedActorType,
      reportedActorId,
      contextEventId,
      reason,
      details,
      contentSnapshot: { ...snapshot, hash },
      status: "open",
      slaDueAt: new Date(Date.now() + SLA_HOURS * 60 * 60 * 1000),
      history: [{ status: "open", at: new Date(), note: "reported" }],
    });
    logAudit({
      action: "moderation.report_created",
      actor: { _id: reporterId, role: reporterType },
      targetType: "system",
      targetId: report._id,
      metadata: { reportTargetType: targetType, reason },
    }).catch(() => {});
    return { reportId: report._id, status: report.status };
  }

  // ── Moderation queue (staff) ─────────────────────────────────────────────
  async listReports({ status, page = 1, limit = 20 } = {}) {
    const q = {};
    if (status) q.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Report.find(q).sort({ slaDueAt: 1, createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Report.countDocuments(q),
    ]);
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async getReport(reportId) {
    const report = await Report.findById(reportId).lean();
    if (!report) throw new AppError("Report not found", 404);
    return report;
  }

  async actOnReport(reportId, { action, note, by }) {
    const report = await Report.findById(reportId);
    if (!report) throw new AppError("Report not found", 404);

    await this._applyAction(report, action);

    const nextStatus = action === "dismiss" ? "dismissed" : "actioned";
    report.status = nextStatus;
    report.resolution = { action, note, by, at: new Date() };
    report.history.push({ status: nextStatus, action, by, note, at: new Date() });
    await report.save();

    logAudit({
      action: "moderation.report_actioned",
      actor: { _id: by, role: "moderator" },
      targetType: "system",
      targetId: report._id,
      metadata: { action, reportTargetType: report.targetType },
    }).catch(() => {});

    return { reportId: report._id, status: report.status, action };
  }

  async _applyAction(report, action) {
    if (action === "approve" || action === "dismiss") return;

    if (action === "suspend" && report.reportedActorType === "user") {
      await User.updateOne(
        { _id: report.reportedActorId },
        { $set: { status: USER_STATUS.SUSPENDED } }
      );
      return;
    }

    if (action === "warn" && report.reportedActorType === "user") {
      await Notification.create({
        userId: report.reportedActorId,
        type: "moderation_warning",
        title: "Content warning",
        titleAr: "تنبيه بخصوص المحتوى",
        message:
          "Content you posted was reported and reviewed. Please follow the Community Rules.",
        messageAr:
          "تم الإبلاغ عن محتوى نشرته ومراجعته. يرجى الالتزام بقواعد المجتمع.",
      }).catch((e) =>
        logger.warn("[moderation] warn notification failed", { error: e.message })
      );
      return;
    }

    if (action === "hide" || action === "remove") {
      await this._mutateContent(report, action);
    }
  }

  async _mutateContent(report, action) {
    const { targetType, targetId } = report;

    // Resolve content by the sub-document _id directly (NOT scoped by event):
    // contextEventId is optional on a report, and scoping by a missing event id
    // silently matched nothing while the report was still marked "actioned".

    if (targetType === "post_event_media") {
      if (action === "hide") {
        await PostEventContent.updateOne(
          { "media._id": targetId },
          { $set: { "media.$.isPublished": false } }
        );
      } else {
        await PostEventContent.updateOne(
          { "media._id": targetId },
          { $pull: { media: { _id: targetId } } }
        );
      }
      return;
    }

    if (targetType === "post_event_comment") {
      // Comments live both at post level and nested under media items.
      if (action === "hide") {
        await PostEventContent.updateOne(
          { "comments._id": targetId },
          { $set: { "comments.$.isHidden": true } }
        );
        await PostEventContent.updateOne(
          { "media.comments._id": targetId },
          { $set: { "media.$[].comments.$[c].isHidden": true } },
          { arrayFilters: [{ "c._id": targetId }] }
        );
      } else {
        await PostEventContent.updateOne(
          { "comments._id": targetId },
          { $pull: { comments: { _id: targetId } } }
        );
        await PostEventContent.updateOne(
          { "media.comments._id": targetId },
          { $pull: { "media.$[].comments": { _id: targetId } } }
        );
      }
      return;
    }

    if (targetType === "service") {
      if (action === "hide") {
        await Service.updateOne({ _id: targetId }, { $set: { isPublic: false } });
      } else {
        // ServiceModel status enum is ["active","disabled"] — use "disabled".
        await Service.updateOne(
          { _id: targetId },
          { $set: { status: "disabled", isPublic: false } }
        );
      }
      return;
    }

    if (targetType === "vendor_profile" || targetType === "user") {
      // Hiding a vendor profile = unapprove it so it leaves public listings.
      await User.updateOne(
        { _id: targetId },
        { $set: { "profile.vendorData.vendorStatus": "pending" } }
      );
    }
  }

  // ── Host approve/reject of pending guest comments ────────────────────────
  async listPendingForHost(hostId, eventId) {
    const content = await PostEventContent.findOne({
      event: eventId,
      host: hostId,
    }).lean();
    if (!content) throw new AppError("Content not found", 404);
    const pending = [];
    (content.comments || []).forEach((c) => {
      if (c.pendingApproval) pending.push({ scope: "post", ...c });
    });
    (content.media || []).forEach((m) =>
      (m.comments || []).forEach((c) => {
        if (c.pendingApproval) pending.push({ scope: "media", mediaId: m._id, ...c });
      })
    );
    return { pending };
  }

  async setCommentApproval(hostId, eventId, commentId, approve) {
    const content = await PostEventContent.findOne({
      event: eventId,
      host: hostId,
    });
    if (!content) throw new AppError("Content not found", 404);

    if (approve) {
      // Approve: clear pending + reveal (post-level and media-level).
      await PostEventContent.updateOne(
        { _id: content._id, "comments._id": commentId },
        { $set: { "comments.$.pendingApproval": false, "comments.$.isHidden": false } }
      );
      await PostEventContent.updateOne(
        { _id: content._id },
        {
          $set: {
            "media.$[].comments.$[c].pendingApproval": false,
            "media.$[].comments.$[c].isHidden": false,
          },
        },
        { arrayFilters: [{ "c._id": commentId }] }
      );
    } else {
      // Reject: remove the comment entirely.
      await PostEventContent.updateOne(
        { _id: content._id },
        { $pull: { comments: { _id: commentId } } }
      );
      await PostEventContent.updateOne(
        { _id: content._id },
        { $pull: { "media.$[].comments": { _id: commentId } } }
      );
    }
    return { commentId, approved: !!approve };
  }
}

module.exports = new ModerationService();
