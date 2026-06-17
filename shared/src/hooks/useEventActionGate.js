"use client";

import { useMemo } from "react";

/**
 * Shared gate hook for the single-event UI (web host single-event,
 * mobile EventDetails / LastEvent / SingleEventStats). Centralises the
 * per-action visibility logic so the two apps can't drift.
 *
 * Inputs:
 *   event           — { status, invitationSettings, staffList,
 *                       messagingStatus, attemptCount, host, whitelabelId,
 *                       taqnyatTemplate, bulkSendCompletedAt,
 *                       resendInviteSentAt }
 *   testMessageSent — local UI state set by the test-message popup
 *   currentUser     — { _id, role, whitelabelId }; gates manual retry
 *
 * Outputs: hasTemplate, canSendTest, canSchedule, hasStaff, isCompleted,
 * isLive, isFailed, isScheduled, hasFailedSends, failedCount,
 * canManualRetry (RBAC mirror of EventFailureBanner / PartialFailureBanner;
 * server still enforces), canResendInvite (one-time re-invite for
 * non-responded / maybe guests, 48h after bulk send).
 */
export function useEventActionGate({
  event,
  testMessageSent = false,
  currentUser = null,
} = {}) {
  return useMemo(() => {
    if (!event) {
      return {
        hasTemplate: false,
        canSendTest: false,
        canSchedule: false,
        hasStaff: false,
        isCompleted: false,
        isLive: false,
        isFailed: false,
        isScheduled: false,
        hasFailedSends: false,
        failedCount: 0,
        canManualRetry: false,
        canResendInvite: false,
        resendInviteTooltip: null,
      };
    }

    const status = event.status;
    const hasTemplate = !!event.taqnyatTemplate?.templateRef;
    const hasStaff = (event.staffList?.length || event.staffCount || 0) > 0;

    const isCompleted = status === "completed";
    const isLive = status === "live";
    const isFailed = status === "failed";
    const isScheduled = status === "scheduled";

    const failedCount = event.messagingStatus?.failedCount || 0;
    const hasFailedSends = failedCount > 0 && (isLive || isCompleted);

    const userRole = currentUser?.role;
    const userId =
      currentUser?._id?.toString?.() || currentUser?._id || currentUser?.id;
    const userWlId = currentUser?.whitelabelId;
    const eventWlId = event.whitelabelId;
    const eventHostId = event.host?._id || event.host;

    const canManualRetry =
      isFailed &&
      (eventHostId?.toString?.() === userId?.toString?.() ||
        userRole === "admin" ||
        userRole === "super_admin" ||
        (userRole === "whitelabel_admin" &&
          eventWlId &&
          userWlId &&
          eventWlId.toString() === userWlId.toString()));

    // Resend-invite gating:
    //   - Already used? -> disabled (one-time only)
    //   - Not live? -> hidden
    //   - No bulkSendCompletedAt? -> disabled (messages not yet sent)
    //   - < 48h since bulkSendCompletedAt? -> disabled (cooldown)
    //   - Otherwise -> enabled
    const resendAlreadyUsed = !!event.resendInviteSentAt;
    const bulkCompletedAt = event.messagingStatus?.bulkSendCompletedAt
      ? new Date(event.messagingStatus.bulkSendCompletedAt).getTime()
      : null;
    const now = Date.now();
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

    let canResendInvite = false;
    let resendInviteTooltip = null;

    if (!isLive) {
      resendInviteTooltip = "resendInvite.notLive";
    } else if (resendAlreadyUsed) {
      resendInviteTooltip = "resendInvite.alreadyUsed";
    } else if (!bulkCompletedAt) {
      resendInviteTooltip = "resendInvite.notSent";
    } else if (now - bulkCompletedAt < FORTY_EIGHT_HOURS_MS) {
      const hoursLeft = Math.ceil(
        (FORTY_EIGHT_HOURS_MS - (now - bulkCompletedAt)) / (3600 * 1000)
      );
      resendInviteTooltip = { key: "resendInvite.cooldown", hoursLeft };
    } else {
      canResendInvite = true;
    }

    return {
      hasTemplate,
      canSendTest: hasTemplate && !testMessageSent && !isCompleted && !isFailed,
      canSchedule:
        hasTemplate && testMessageSent && !isLive && !isCompleted && !isFailed,
      hasStaff,
      isCompleted,
      isLive,
      isFailed,
      isScheduled,
      hasFailedSends,
      failedCount,
      canManualRetry,
      canResendInvite,
      resendInviteTooltip,
    };
  }, [event, testMessageSent, currentUser]);
}

export default useEventActionGate;
