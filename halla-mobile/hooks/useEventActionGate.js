import { useMemo } from "react";

/**
 * Phase 4b W2-POLL-FAIL — mobile companion of `labbe/hooks/events/useEventActionGate.js`.
 *
 * Same prop shape, same return shape, so the manual-verification
 * checklist's parity test ("returns the same gate state as web for the
 * same event payload") passes. Used by the mobile single-event
 * components that previously inlined gate logic
 * (`components/home/EventActionsHeader.js`,
 * `components/home/LastEvent.js`, `components/events/SingleEventStats.js`).
 *
 * Inputs
 *   event           — event payload from the API (status,
 *                     invitationSettings, staffList, messagingStatus,
 *                     attemptCount, host, whitelabelId).
 *   testMessageSent — local flag (set after a successful test send).
 *   currentUser     — auth user ({ _id, role, whitelabelId }).
 *
 * Outputs
 *   hasTemplate, canSendTest, canSchedule, hasStaff, isCompleted,
 *   isLive, isFailed, isScheduled, hasFailedSends (live or completed
 *   + failedCount > 0), failedCount, canManualRetry.
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
    const hasTemplate = !!event.taqnyatTemplate?.templateRef;
    const hasStaff =
      (event.staffList?.length || event.staffCount || 0) > 0;

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
