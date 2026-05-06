"use client";
import { useCallback } from "react";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import {
  useUpdateEventDetails,
  useUpdateEventStep2,
  useUpdateInvitationSettings,
} from "@/hooks/events/mutations/useEventMutation";

/**
 * Encapsulates the save / cancel mutation logic for the update-event wizard.
 *
 * Extracted from UpdateEventWizard to keep the parent component
 * under the 250-line limit (Rule 1 / Rule 9).
 *
 * Returns { updateEventSection, handleSave, handleCancel }.
 */
const useUpdateEventActions = ({
  eventId,
  currentStep,
  buildStepPayload,
  isStepValid,
  isEventLive,
  setIsSaving,
  router,
  buildReturnUrl,
  t,
}) => {
  const updateEventDetails = useUpdateEventDetails();
  // Phase 4d W1-WEB-ATOMIC: single PATCH to /events/:id/step2.
  const updateEventStep2 = useUpdateEventStep2();
  const updateInvitationSettings = useUpdateInvitationSettings();

  const updateEventSection = useCallback(async () => {
    if (!eventId) return;

    const payload = buildStepPayload(currentStep);
    if (!payload) return;

    setIsSaving(true);

    try {
      if (payload.type === "eventDetails") {
        await updateEventDetails.mutateAsync({ eventId, data: payload.data });
      } else if (payload.type === "step2") {
        await updateEventStep2.mutateAsync({ eventId, data: payload.data });
      } else if (payload.type === "invitationSettings") {
        await updateInvitationSettings.mutateAsync({
          eventId,
          data: payload.data,
        });
      }
      toastUtils.success(payload.successMessage);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "errors.update_failed" });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [
    eventId,
    currentStep,
    buildStepPayload,
    updateEventDetails,
    updateEventStep2,
    updateInvitationSettings,
    setIsSaving,
    t,
  ]);

  const handleSave = useCallback(async () => {
    if (!isStepValid) {
      toastUtils.error(t("errors.complete_required_fields"));
      return;
    }

    if (isEventLive && currentStep !== 2) {
      toastUtils.error(t("update_locked_live_event"));
      return;
    }

    try {
      await updateEventSection();
      router.push(buildReturnUrl());
    } catch {
      // Error already handled inside updateEventSection
    }
  }, [
    isStepValid,
    updateEventSection,
    router,
    buildReturnUrl,
    t,
    isEventLive,
    currentStep,
  ]);

  const handleCancel = useCallback(() => {
    router.push(buildReturnUrl());
  }, [router, buildReturnUrl]);

  return { updateEventSection, handleSave, handleCancel };
};

export default useUpdateEventActions;
