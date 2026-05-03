"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../create-event/page.module.css";
import Header from "../../create-event/_components/header/Header";
import StepTitleAndDesc from "../../create-event/_components/stepTitleAndDesc/StepTitleAndDesc";
import StepOne from "../../create-event/_components/stepOne/StepOne";
import StepTwo from "../../create-event/_components/stepTwo/StepTwo";
import StepThree from "../../create-event/_components/stepThree/StepThree";
import StepFour from "../../create-event/_components/stepFour/StepFour";
import UpdateButtons from "./UpdateButtons";
import WhatsappPreview from "../../create-event/_components/whatsappPreview/WhatsappPreview";
import MobilePreviewButton from "../../create-event/_components/mobilePreviewButton/MobilePreviewButton";
import {
  useEventById,
  useEventSubscriptionInfo,
  useEventForm,
  mapEventToFormValues,
} from "@/hooks/events";
import {
  useUpdateEventDetails,
  useUpdateEventStep2,
  useUpdateInvitationSettings,
  useUpdateLaunchSettings,
} from "@/hooks/events/mutations/useEventMutation";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";

/**
 * Phase 4b W1-UNIFY: shared update-event wizard used by host, admin-dash,
 * and (in the future) any whitelabel-scoped route. Role-aware behavior
 * lives inside this component as branches; there is no separate
 * admin/whitelabel component tree.
 *
 * Props
 *   returnPath  — relative locale-less path to push on save / cancel
 *                 (e.g. "host" or "admin-dash/events"). Each route's
 *                 thin page.js wrapper supplies the right value.
 */
const UpdateEventWizard = ({ returnPath = "host" }) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = searchParams.get("id");
  const currentStep = parseInt(searchParams.get("step"), 10) || 1;

  const [pageState, setPageState] = useState({
    isSaving: false,
    showMobilePreview: false,
  });

  const {
    methods,
    formData,
    isStepValid,
    buildStepPayload,
    locale,
    t,
    reset,
  } = useEventForm({ mode: "update", eventId, totalSteps: 4 });

  const buildReturnUrl = useCallback(
    () => `/${locale}/${returnPath}`,
    [locale, returnPath]
  );

  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useEventById(eventId);
  const { data: subscriptionData } = useEventSubscriptionInfo();
  const subscriptionInfo = subscriptionData?.data;

  const updateEventDetails = useUpdateEventDetails();
  // Phase 4d W1-WEB-ATOMIC: step 2 now dispatches a single PATCH to
  // /events/:id/step2 instead of parallel guest-list + staff-list
  // mutations.
  const updateEventStep2 = useUpdateEventStep2();
  const updateInvitationSettings = useUpdateInvitationSettings();
  const updateLaunchSettings = useUpdateLaunchSettings();

  const eventRaw = eventData?.data?.event || eventData?.event || null;
  // Phase 4b W1-UPD (D10): when an event is `live`, every section except
  // step 2's allow-add-only branch is locked. The wizard renders the
  // banner and disables save outside of step 2.
  const isEventLive = eventRaw?.status === "live";

  useEffect(() => {
    if (eventRaw) {
      reset(mapEventToFormValues(eventRaw));
    }
  }, [eventRaw, reset]);

  useEffect(() => {
    if (eventError) {
      handleError(eventError, t, { fallbackMessage: "errors.load_failed" });
      router.push(buildReturnUrl());
    }
  }, [eventError, router, buildReturnUrl, t]);

  useEffect(() => {
    if (!eventId) {
      toastUtils.error(t("errors.event_id_missing"));
      router.push(buildReturnUrl());
    }
  }, [eventId, router, buildReturnUrl, t]);

  const updateEventSection = useCallback(async () => {
    if (!eventId) return;

    const payload = buildStepPayload(currentStep);
    if (!payload) return;

    setPageState((prev) => ({ ...prev, isSaving: true }));

    try {
      if (payload.type === "eventDetails") {
        await updateEventDetails.mutateAsync({ eventId, data: payload.data });
      } else if (payload.type === "step2") {
        // Single atomic dispatch — server runs guest + staff updates in
        // one Mongo transaction (or compensation rollback on a
        // standalone topology) per Phase 4d W0-ATOMIC.
        await updateEventStep2.mutateAsync({ eventId, data: payload.data });
      } else if (payload.type === "invitationSettings") {
        await updateInvitationSettings.mutateAsync({
          eventId,
          data: payload.data,
        });
      } else if (payload.type === "launchSettings") {
        // Phase 4b W1-UPD: step 4 dispatches launch settings save.
        await updateLaunchSettings.mutateAsync({
          eventId,
          data: payload.data,
        });
      }
      toastUtils.success(payload.successMessage);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "errors.update_failed" });
      throw error;
    } finally {
      setPageState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [
    eventId,
    currentStep,
    buildStepPayload,
    updateEventDetails,
    updateEventStep2,
    updateInvitationSettings,
    updateLaunchSettings,
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
      // Error already handled
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

  const toggleMobilePreview = useCallback((show) => {
    setPageState((prev) => ({ ...prev, showMobilePreview: show }));
  }, []);

  const stepConfig = useMemo(
    () => ({
      1: {
        title: t("step1_title"),
        description: t("step1_description"),
        Component: StepOne,
      },
      2: {
        title: t("step2_title"),
        description: t("step2_description"),
        Component: StepTwo,
        props: {
          subscription: {
            guests: {
              limitPerEvent:
                eventRaw?.guestLimit ||
                subscriptionInfo?.guests?.limitPerEvent ||
                subscriptionInfo?.limits?.maxGuestsPerEvent ||
                0,
              isUnlimited:
                eventRaw?.guestLimit === -1 ||
                subscriptionInfo?.guests?.isUnlimited ||
                false,
            },
            limits: subscriptionInfo?.limits,
          },
          // Phase 4b W1-UPD (D10): when the event is live, only step 2
          // accepts guest additions; the existing rows are locked.
          allowAddOnly: isEventLive,
        },
      },
      3: {
        title: t("step3_title"),
        description: t("step3_description"),
        Component: StepThree,
      },
      4: {
        title: t("step4_title"),
        description: t("step4_description"),
        Component: StepFour,
      },
    }),
    [subscriptionInfo, t, eventRaw, isEventLive]
  );

  const currentStepConfig = stepConfig[currentStep];

  if (eventLoading) {
    return <SimpleLoading message={t("loading.loading_event")} />;
  }

  const { Component: StepComponent, props: stepProps = {} } = currentStepConfig;

  // Phase 4b W1-UPD (D10): the lockout banner appears at the top of every
  // step on a live event. Step 2 stays interactive (allow-add-only); other
  // steps render the banner above the disabled form.
  const lockoutActive = isEventLive && currentStep !== 2;

  return (
    <FormProvider {...methods}>
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          <div className={styles.header_wrapper}>
            <Header
              title={t("update_page_title")}
              description={t("update_page_description")}
              buttonText={t("promo_button")}
            />
          </div>

          {isEventLive && (
            <div
              role="status"
              style={{
                margin: "12px 24px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "#FFF7E6",
                color: "#7A4F01",
                border: "1px solid #FFD591",
                fontSize: "14px",
              }}
            >
              {currentStep === 2
                ? t("live_event_step2_notice")
                : t("live_event_locked_notice")}
            </div>
          )}

          <div className={styles.content_wrapper}>
            <div
              className={`${styles.form_section} ${
                currentStep === 4 ? styles.form_section_wide : ""
              }`}
            >
              <form
                className={styles.form_card}
                onSubmit={(e) => e.preventDefault()}
              >
                <StepTitleAndDesc
                  title={currentStepConfig.title}
                  description={currentStepConfig.description}
                />
                <fieldset
                  disabled={lockoutActive}
                  style={{ border: 0, padding: 0, margin: 0 }}
                >
                  <StepComponent {...stepProps} />
                </fieldset>
                <UpdateButtons
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaveDisabled={!isStepValid || lockoutActive}
                  isSaving={pageState.isSaving}
                  currentStep={currentStep}
                  totalSteps={4}
                />
              </form>
            </div>

            {currentStep === 4 && (
              <WhatsappPreview
                eventTitle={formData.eventName || ""}
                invitationMessage={formData.selectedTemplate?.bodyText || ""}
                templateImage={
                  formData.templateImage || "/svg/events/invitation.svg"
                }
                templateData={formData.visualTemplate?.data || {}}
                locale={locale}
              />
            )}
          </div>

          {currentStep === 4 && (
            <MobilePreviewButton onClick={() => toggleMobilePreview(true)} />
          )}

          {pageState.showMobilePreview && currentStep === 4 && (
            <div
              className={styles.modal_overlay}
              onClick={() => toggleMobilePreview(false)}
            >
              <div
                className={styles.modal_content}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={styles.modal_close}
                  onClick={() => toggleMobilePreview(false)}
                  type="button"
                >
                  ×
                </button>
                <WhatsappPreview
                  eventTitle={formData.eventName || ""}
                  invitationMessage={formData.selectedTemplate?.bodyText || ""}
                  templateImage={
                    formData.templateImage || "/svg/events/invitation.svg"
                  }
                  templateData={formData.visualTemplate?.data || {}}
                  locale={locale}
                  forceShow={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
};

const WrappedUpdateEventWizard = ({ returnPath }) => {
  const { t } = useTranslation("createEvent");

  return (
    <ErrorBoundary
      fallbackTitle={t("errors.boundary")}
      fallbackMessage={t("errors.boundary")}
    >
      <UpdateEventWizard returnPath={returnPath} />
    </ErrorBoundary>
  );
};

export default WrappedUpdateEventWizard;
