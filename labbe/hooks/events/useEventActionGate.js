"use client";

import { useMemo } from "react";

/**
 * Shared gate hook for the host single-event UI. Centralises the
 * per-action visibility logic so EventActionsHeader, LastEventStats, and
 * the mobile companions can't drift apart.
 *
 * Inputs:
 *   event           — { status, invitationSettings, staffList,
 *                       messagingStatus, attemptCount, host, whitelabelId }
 *   testMessageSent — local UI state set by the test-message popup
 *   currentUser     — { _id, role, whitelabelId }; gates manual retry
 *
 * Outputs: hasTemplate, canSendTest, canSchedule, hasStaff, isCompleted,
 * isLive, isFailed, isScheduled, hasFailedSends, failedCount,
 * canManualRetry (mirrors EventFailureBanner's RBAC).
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
      };
    }

    const status = event.status;
    // Accept canonical `taqnyatTemplate.templateRef` or legacy
    // `invitationSettings.selectedTemplate.name`; mirrors the mobile gate.
    const hasTemplate =
      !!event.taqnyatTemplate?.templateRef ||
      !!event.invitationSettings?.selectedTemplate?.name;
    const hasStaff = (event.staffList?.length || event.staffCount || 0) > 0;

    const isCompleted = status === "completed";
    const isLive = status === "live";
    const isFailed = status === "failed";
    const isScheduled = status === "scheduled";

    const failedCount = event.messagingStatus?.failedCount || 0;
    // D9: any failed → partial-failure banner. The wider "live OR
    // completed" gate keeps the warning visible into post-event review
    // for hosts who want to know which guests never received the
    // invitation.
    const hasFailedSends = failedCount > 0 && (isLive || isCompleted);

    // Manual retry button RBAC mirror (server enforces too). Host of
    // the event, owning whitelabel-admin, or platform admin.
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
    };
  }, [event, testMessageSent, currentUser]);
}

export default useEventActionGate;
