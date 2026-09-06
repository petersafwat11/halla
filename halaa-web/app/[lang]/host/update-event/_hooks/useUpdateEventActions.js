"use client";
import { eventUpdateSection } from "@halaa/shared/utils/eventUpdateSection";
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
 * Returns { updateEventSection, handleSave, handleCancel }.
 */
const useUpdateEventActions = ({
  eventId,
  currentStep,
  buildStepPayload,
  isStepValid,
  isEventLive,
  eventStatus,
  setIsSaving,
  router,
  buildReturnUrl,
  t,
}) => {
  const updateEventDetails = useUpdateEventDetails();
  // Atomic guest+staff replace via PATCH /events/:id/step2.
  const updateEventStep2 = useUpdateEventStep2();
  const updateInvitationSettings = useUpdateInvitationSettings();

  const updateEventSection = useCallback(async () => {
    if (!eventId) throw new Error("Missing event ID");

    setIsSaving(true);

    try {
      const { section, data } = eventUpdateSection(buildStepPayload(currentStep));
      const mutation = section === "details" ? updateEventDetails
        : section === "people" ? updateEventStep2 : updateInvitationSettings;
      const result = await mutation.mutateAsync({ eventId, data });
      if (!result || result.success === false) throw new Error("Event update was not confirmed");
      const updatedEvent = result?.data?.event || result?.event;
      toastUtils.success(t(eventStatus === "scheduled" && updatedEvent?.status === "pending_scheduling" ? "changes_saved_unscheduled" : "changes_saved"));
      return result;
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
    eventStatus,
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
