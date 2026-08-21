"use client";

import { useMemo } from "react";

/**
 * Pure calculation function for event action gate logic.
 */
export function computeEventActionGate({
  event,
  testMessageSent = false,
  currentUser = null,
} = {}) {
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
  const eventHostId = event.host?._id || event.host;

  const canManualRetry =
    isFailed &&
    (eventHostId?.toString?.() === userId?.toString?.() ||
      userRole === "admin" ||
      userRole === "super_admin");

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
}

/**
 * Shared gate hook for the single-event UI (web host single-event,
 * mobile EventDetails / LastEvent / SingleEventStats). Centralises the
 * per-action visibility logic so the two apps can't drift.
 *
 * Inputs:
 *   event           — { status, invitationSettings, staffList,
 *                       messagingStatus, attemptCount, host,
 *                       taqnyatTemplate }
 *   testMessageSent — local UI state set by the test-message popup
 *   currentUser     — { _id, role }; gates manual retry
 *
 * Outputs: hasTemplate, canSendTest, canSchedule, hasStaff, isCompleted,
 * isLive, isFailed, isScheduled, hasFailedSends, failedCount,
 * canManualRetry (RBAC mirror of EventFailureBanner / PartialFailureBanner;
 * server still enforces).
 */
export function useEventActionGate({
  event,
  testMessageSent = false,
  currentUser = null,
} = {}) {
  return useMemo(
    () => computeEventActionGate({ event, testMessageSent, currentUser }),
    [event, testMessageSent, currentUser]
  );
}

export default useEventActionGate;
