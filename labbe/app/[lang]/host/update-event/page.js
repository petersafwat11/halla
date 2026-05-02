"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import styles from "../create-event/page.module.css";
import Header from "../create-event/_components/header/Header";
import StepTitleAndDesc from "../create-event/_components/stepTitleAndDesc/StepTitleAndDesc";
import StepOne from "../create-event/_components/stepOne/StepOne";
import StepTwo from "../create-event/_components/stepTwo/StepTwo";
import StepThree from "../create-event/_components/stepThree/StepThree";
import StepFour from "../create-event/_components/stepFour/StepFour";
import UpdateButtons from "./_components/UpdateButtons";
import WhatsappPreview from "../create-event/_components/whatsappPreview/WhatsappPreview";
import MobilePreviewButton from "../create-event/_components/mobilePreviewButton/MobilePreviewButton";
import {
  useEventById,
  useEventSubscriptionInfo,
  useEventForm,
  mapEventToFormValues,
} from "@/hooks/events";
import {
  useUpdateEventDetails,
  useUpdateGuestList,
  useUpdateStaffList,
  useUpdateInvitationSettings,
} from "@/hooks/events/mutations/useEventMutation";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";

import { handleError } from "@/services/errorHandlingService";

// Data transformation utilities are now imported from useEventForm

const UpdateEventPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const eventId = searchParams.get("id");
  const currentStep = parseInt(searchParams.get("step"), 10) || 1;

  const [pageState, setPageState] = useState({
    isSaving: false,
    showMobilePreview: false,
  });

  // Use unified event form hook
  const {
    methods,
    formData,
    isStepValid,
    buildStepPayload,
    locale,
    t,
    reset,
  } = useEventForm({ mode: "update", eventId, totalSteps: 4 });

  // React Query hooks
  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useEventById(eventId);
  const { data: subscriptionData } = useEventSubscriptionInfo();
  const subscriptionInfo = subscriptionData?.data;

  // Mutations
  const updateEventDetails = useUpdateEventDetails();
  const updateGuestList = useUpdateGuestList();
  const updateStaffList = useUpdateStaffList();
  const updateInvitationSettings = useUpdateInvitationSettings();

  // Extract raw event for guestLimit access
  const eventRaw = eventData?.data?.event || eventData?.event || null;

  // Reset form when event data is loaded
  useEffect(() => {
    if (eventRaw) {
      reset(mapEventToFormValues(eventRaw));
    }
  }, [eventRaw, reset]);

  // Handle errors
  useEffect(() => {
    if (eventError) {
      handleError(eventError, t, { fallbackMessage: "errors.load_failed" });
      router.push(`/${locale}/host`);
    }
  }, [eventError, router, locale, t]);

  // Handle missing eventId
  useEffect(() => {
    if (!eventId) {
      toastUtils.error(t("errors.event_id_missing"));
      router.push(`/${locale}/host`);
    }
  }, [eventId, router, locale, t]);

  // Update event section using unified payload builder
  const updateEventSection = useCallback(async () => {
    if (!eventId) return;

    const payload = buildStepPayload(currentStep);
    if (!payload) return;

    setPageState((prev) => ({ ...prev, isSaving: true }));

    try {
      if (payload.type === "eventDetails") {
        await updateEventDetails.mutateAsync({ eventId, data: payload.data });
      } else if (payload.type === "guestList") {
        await Promise.all([
          updateGuestList.mutateAsync({
            eventId,
            data: { guestList: payload.data.guestList },
          }),
          updateStaffList.mutateAsync({
            eventId,
            data: { staffList: payload.data.staffList },
          }),
        ]);
      } else if (payload.type === "invitationSettings") {
        await updateInvitationSettings.mutateAsync({ eventId, data: payload.data });
      }
      toastUtils.success(payload.successMessage);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "errors.update_failed" });
      throw error;
    } finally {
      setPageState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [eventId, currentStep, buildStepPayload, updateEventDetails, updateGuestList, updateStaffList, updateInvitationSettings, t]);

  const handleSave = useCallback(async () => {
    if (!isStepValid) {
      toastUtils.error(t("errors.complete_required_fields"));
      return;
    }

    try {
      await updateEventSection();
      router.push(`/${locale}/host`);
    } catch {
      // Error already handled
    }
  }, [isStepValid, updateEventSection, router, locale, t]);

  const handleCancel = useCallback(() => {
    router.push(`/${locale}/host`);
  }, [router, locale]);

  const toggleMobilePreview = useCallback((show) => {
    setPageState((prev) => ({ ...prev, showMobilePreview: show }));
  }, []);

  // Step content configuration
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
              limitPerEvent: eventRaw?.guestLimit || subscriptionInfo?.guests?.limitPerEvent || subscriptionInfo?.limits?.maxGuestsPerEvent || 0,
              isUnlimited: eventRaw?.guestLimit === -1 || subscriptionInfo?.guests?.isUnlimited || false,
            },
            limits: subscriptionInfo?.limits,
          },
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
    [subscriptionInfo, t]
  );

  const currentStepConfig = stepConfig[currentStep];

  if (eventLoading) {
    return <SimpleLoading message={t("loading.loading_event")} />;
  }

  const { Component: StepComponent, props: stepProps = {} } = currentStepConfig;

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

          <div className={styles.content_wrapper}>
            <div
              className={`${styles.form_section} ${currentStep === 4 ? styles.form_section_wide : ""
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
                <StepComponent {...stepProps} />
                <UpdateButtons
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaveDisabled={!isStepValid}
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
                templateImage={formData.templateImage || "/svg/events/invitation.svg"}
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
                  templateImage={formData.templateImage || "/svg/events/invitation.svg"}
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

const WrappedUpdateEventPage = () => {
  const { t } = useTranslation("createEvent");

  return (
    <ErrorBoundary
      fallbackTitle={t("errors.boundary")}
      fallbackMessage={t("errors.boundary")}
    >
      <UpdateEventPage />
    </ErrorBoundary>
  );
};

export default WrappedUpdateEventPage;
