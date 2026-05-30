"use client";
import React, { useState, useCallback } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import styles from "./page.module.css";
import Header from "./_components/header/Header";
import Stepper from "./_components/stepper/Stepper";
import StepTitleAndDesc from "./_components/stepTitleAndDesc/StepTitleAndDesc";
import StepOne from "./_components/stepOne/StepOne";
import StepTwo from "./_components/stepTwo/StepTwo";
import StepThree from "./_components/stepThree/StepThree";
import StepFour from "./_components/stepFour/StepFour";
import Summary from "./_components/summary/Summary";
import Buttons from "./_components/buttons/Buttons";
import WhatsappPreview from "./_components/whatsappPreview/WhatsappPreview";
import MobilePreviewButton from "./_components/mobilePreviewButton/MobilePreviewButton";
import StaffPopup from "./_components/staffPopup/StaffPopup";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import { useEventSubscriptionInfo, useEventForm } from "@/hooks/events";
import { useCreateEvent } from "@/hooks/events/mutations/useEventMutation";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useTranslation } from "react-i18next";
import EventLimitReached from "@/ui/host/subscription/EventLimitReached";
import { toastUtils } from "@/utils/toastUtils";

import { handleError } from "@/services/errorHandlingService";

const CreateEventV2 = () => {
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showStaffPopup, setShowStaffPopup] = useState(false);
  const router = useRouter();
  const params = useParams();

  // Use unified event form hook
  const {
    methods,
    formData,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    isStepValid,
    validateStep,
    staffList,
    addStaffMember,
    editStaffMember,
    deleteStaffMember,
    locale,
    buildEventPayload,
    t,
    handleSubmit,
  } = useEventForm({ mode: "create", totalSteps: 5 });

  // React Query hooks
  const { data: subscriptionData, isLoading: subscriptionLoading } =
    useEventSubscriptionInfo();
  const createEvent = useCreateEvent();

  // Derived state - backend returns { data: { hasSubscription, limits, usage, canCreateEvent } }
  const subscriptionInfo = subscriptionData?.data;
  const canCreateEvent =
    !subscriptionInfo?.hasSubscription || subscriptionInfo?.canCreateEvent !== false;

  // Submit handler using unified payload builder
  const onSubmit = useCallback(
    async (data) => {
      try {
        // No client-side guard for templateImage — visualTemplate
        // selection is enforced by validateStep(3), and the backend
        // accepts submissions with `visualTemplateRef + fieldValues`
        // alone (no baked File required). Reference `data` so the
        // closure tracks it for hot-reload correctness.
        void data;

        const eventPayload = buildEventPayload();
        await createEvent.mutateAsync(eventPayload);

        toastUtils.success(t("success.event_created"));
        router.push(`/${params.lang}/host`);
      } catch (error) {
        handleError(error, t, { fallbackMessage: "errors.create_failed" });
      }
    },
    [createEvent, router, params, t, buildEventPayload]
  );

  const onNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toastUtils.error(t("errors.complete_required_fields"));
      return;
    }

    if (currentStep < 5) {
      goToNextStep();
    } else {
      handleSubmit(onSubmit)();
    }
  }, [currentStep, handleSubmit, onSubmit, validateStep, goToNextStep, t]);

  const onPrevious = useCallback(() => {
    goToPreviousStep();
  }, [goToPreviousStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <StepTitleAndDesc
              title={t("step1_title")}
              description={t("step1_description")}
            />
            <StepOne />
          </>
        );
      case 2:
        return (
          <>
            <StepTitleAndDesc
              title={t("step2_title")}
              description={t("step2_description")}
              Button={
                <Button
                  variant="secondary"
                  onClick={() => setShowStaffPopup(true)}
                  title={t("staff_button")}
                />
              }
            />
            <StepTwo subscription={subscriptionInfo} />
          </>
        );
      case 3:
        return (
          <>
            <StepTitleAndDesc
              title={t("step3_title")}
              description={t("step3_description")}
            />
            <StepThree />
          </>
        );
      case 4:
        return (
          <>
            <StepTitleAndDesc
              title={t("step4_title")}
              description={t("step4_description")}
            />
            <StepFour />
          </>
        );
      case 5:
        return (
          <>
            <StepTitleAndDesc
              title={t("step5_title")}
              description={t("step5_description")}
            />
            <Summary />
          </>
        );
      default:
        return null;
    }
  };

  // Show loading state while checking subscription
  if (subscriptionLoading) {
    return (
      <SimpleLoading message={t("loading.checking_subscription")} />
    );
  }

  // Show event limit reached if user cannot create events
  if (!canCreateEvent && subscriptionInfo) {
    return (
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          <EventLimitReached subscription={subscriptionInfo} />
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          {/* Header */}
          <div className={styles.header_wrapper}>
            <Header
              title={t("page_title")}
              description={t("page_description")}
              buttonText={t("promo_button")}
            />
          </div>

          {/* Stepper */}
          <div className={styles.stepper_wrapper}>
            <Stepper currentStep={currentStep} />
          </div>

          {/* Content Area */}
          <div className={styles.content_wrapper}>
            <div
              className={`${styles.form_section} ${currentStep === 4 ? styles.form_section_wide : ""
                }`}
            >
              <form
                className={styles.form_card}
                onSubmit={(e) => e.preventDefault()}
              >
                {renderStepContent()}
                <Buttons
                  onNext={onNext}
                  onPrevious={onPrevious}
                  isNextDisabled={!isStepValid || createEvent.isPending}
                  showPrevious={currentStep > 1}
                  isLoading={createEvent.isPending}
                  currentStep={currentStep}
                  totalSteps={5}
                />
              </form>
            </div>

            {/* WhatsApp Preview - Only show on Step 4 */}
            {currentStep === 4 && (
              <div className={styles.preview_wrapper}>
                <WhatsappPreview
                  eventTitle={formData.eventName || ""}
                  previewBody={formData.selectedTemplate?.bodyText || ""}
                  templateImage={formData.templateImage || "/svg/events/invitation.svg"}
                  templateData={formData.visualTemplate?.data || {}}
                  selectedTemplate={formData.selectedTemplate}
                  eventDate={formData.eventDate || ""}
                  eventTime={formData.eventTime || ""}
                  locationAddress={formData.address?.address || ""}
                  locale={locale}
                />
              </div>
            )}
          </div>

          {/* Mobile Preview Button - Only show on Step 4 */}
          {currentStep === 4 && (
            <MobilePreviewButton onClick={() => setShowMobilePreview(true)} />
          )}

          {/* Mobile WhatsApp Preview Modal */}
          {showMobilePreview && currentStep === 4 && (
            <div
              className={styles.modal_overlay}
              onClick={() => setShowMobilePreview(false)}
            >
              <div
                className={styles.modal_content}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={styles.modal_close}
                  onClick={() => setShowMobilePreview(false)}
                  type="button"
                >
                  ×
                </button>
                <WhatsappPreview
                  eventTitle={formData.eventName || ""}
                  previewBody={formData.selectedTemplate?.bodyText || ""}
                  templateImage={formData.templateImage || "/svg/events/invitation.svg"}
                  templateData={formData.visualTemplate?.data || {}}
                  locale={locale}
                  forceShow={true}
                />
              </div>
            </div>
          )}

          {/* Staff Popup */}
          <PopupWrapper
            isOpen={showStaffPopup}
            onClose={() => setShowStaffPopup(false)}
          >
            <StaffPopup
              staffList={staffList}
              onAdd={addStaffMember}
              onEdit={editStaffMember}
              onDelete={deleteStaffMember}
              onClose={() => setShowStaffPopup(false)}
            />
          </PopupWrapper>
        </div>
      </div>
    </FormProvider>
  );
};

const WrappedCreateEventV2 = () => {
  const { t } = useTranslation("createEvent");

  return (
    <ErrorBoundary
      fallbackTitle={t("errors.boundary")}
      fallbackMessage={t("errors.boundary")}
    >
      <CreateEventV2 />
    </ErrorBoundary>
  );
};

export default WrappedCreateEventV2;
