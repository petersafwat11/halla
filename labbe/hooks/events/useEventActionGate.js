"use client";

import { useMemo } from "react";

/**
 * Phase 4b W1-GATE-FAIL: shared gate hook for the host single-event UI.
 *
 * Centralises the per-action visibility logic that previously lived
 * inlined in `ui/host/events/EventActionsHeader.jsx`,
 * `ui/host/main-page/latsEventStats/LastEventStats.jsx`, and the mobile
 * companions. A single call site makes it impossible to drift the
 * gating in one consumer relative to another.
 *
 * Inputs
 *   event           — the event payload (with status, invitationSettings,
 *                     staffList, messagingStatus, attemptCount, host,
 *                     whitelabelId).
 *   testMessageSent — local UI state (the host page tracks this
 *                     optimistically after the test-message popup).
 *   currentUser     — req.user equivalent ({ _id, role, whitelabelId });
 *                     used to gate the manual retry button.
 *
 * Outputs
 *   hasTemplate, canSendTest, canSchedule, hasStaff, isCompleted, isLive,
 *   isFailed, isScheduled, hasFailedSends (live + failedCount > 0),
 *   canManualRetry (mirror of EventFailureBanner's RBAC).
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
    // Phase 4c W0-RENAME — accept either canonical
    // `taqnyatTemplate.templateRef` or legacy
    // `invitationSettings.selectedTemplate.name` during the dual-write
    // window. Mirrors the mobile gate.
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
