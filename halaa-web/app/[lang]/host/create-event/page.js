"use client";
import React, { useState, useCallback, useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter } from "next/navigation";
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
import NoSubscriptionBanner from "@/ui/host/subscription/NoSubscriptionBanner";
import useAuthStore from "@/stores/authStore";
import { toastUtils } from "@/utils/toastUtils";

import { handleError } from "@/services/errorHandlingService";

const CreateEventV2 = () => {
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showStaffPopup, setShowStaffPopup] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  // Use unified event form hook
  const {
    methods,
    formData,
    currentStep,
    goToStep,
    goToNextStep,
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

  // Business accounts have no subscription until an admin activates one, and
  // create-event is subscription-gated server-side (403). Reflect that here so
  // the business user sees the "activate a plan / contact admin" banner instead
  // of bouncing off a server error mid-wizard.
  const user = useAuthStore((state) => state.user);
  const isBusiness = user?.accountType === "business";

  // Derived state - backend returns { data: { hasSubscription, limits, usage, canCreateEvent } }
  const subscriptionInfo = subscriptionData?.data;
  const businessNoSub = isBusiness && subscriptionInfo?.hasSubscription === false;
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
        // Once the backend accepts this submission, the subscription query can
        // legitimately report that the plan is exhausted. Keep the wizard in
        // its completion state until navigation unmounts it instead of letting
        // that refresh replace the page with the limit-reached view.
        setIsCompleting(true);
        await createEvent.mutateAsync(eventPayload);

        toastUtils.success(t("success.event_created"));
        router.replace(`/${locale}/host`);
      } catch (error) {
        setIsCompleting(false);
        handleError(error, t, { fallbackMessage: "errors.create_failed" });
      }
    },
    [createEvent, router, locale, t, buildEventPayload]
  );

  const onNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toastUtils.error(t("errors.complete_required_fields"));
      return;
    }

    if (currentStep < 5) {
      if (goToNextStep()) {
        const url = new URL(window.location.href);
        url.searchParams.set("step", String(currentStep + 1));
        window.history.pushState(
          { ...window.history.state, halaaCreateEventStep: currentStep + 1 },
          "",
          url
        );
      }
    } else {
      handleSubmit(onSubmit)();
    }
  }, [currentStep, handleSubmit, onSubmit, validateStep, goToNextStep, t]);

  const onPrevious = useCallback(() => {
    if (currentStep > 1) window.history.back();
  }, [currentStep]);

  // Keep wizard steps in same-route browser history. Browser Back and the
  // visible Previous button now move one step without remounting the page or
  // clearing the form.
  useEffect(() => {
    const initialUrl = new URL(window.location.href);
    initialUrl.searchParams.set("step", "1");
    window.history.replaceState(
      { ...window.history.state, halaaCreateEventStep: 1 },
      "",
      initialUrl
    );

    const handlePopState = () => {
      const step = Number(new URL(window.location.href).searchParams.get("step"));
      if (Number.isInteger(step) && step >= 1 && step <= 5) goToStep(step);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [goToStep]);

  const handleHeaderBack = useCallback(() => {
    if (currentStep > 1) {
      onPrevious();
      return;
    }
    const shouldLeave = window.confirm(
      locale === "ar"
        ? "سيتم فقدان بيانات المناسبة غير المحفوظة. هل تريد الرجوع؟"
        : "Your unsaved event details will be lost. Do you want to go back?"
    );
    if (shouldLeave) router.push(`/${locale}/host`);
  }, [currentStep, locale, onPrevious, router]);

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
  if (subscriptionLoading && !isCompleting) {
    return (
      <SimpleLoading message={t("loading.checking_subscription")} />
    );
  }

  // Business account with no active subscription — admin must activate a plan.
  if (!isCompleting && businessNoSub) {
    return (
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          <NoSubscriptionBanner showAction />
        </div>
      </div>
    );
  }

  // Show event limit reached if user cannot create events
  if (!isCompleting && !canCreateEvent && subscriptionInfo) {
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
              onButtonClick={handleHeaderBack}
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
                {currentStep === 4 && (
                  <MobilePreviewButton
                    onClick={() => setShowMobilePreview(true)}
                  />
                )}
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
                  invitationType={formData.invitationType}
                />
              </div>
            )}
          </div>

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
                  selectedTemplate={formData.selectedTemplate}
                  eventDate={formData.eventDate || ""}
                  eventTime={formData.eventTime || ""}
                  locationAddress={formData.address?.address || ""}
                  locale={locale}
                  invitationType={formData.invitationType}
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
