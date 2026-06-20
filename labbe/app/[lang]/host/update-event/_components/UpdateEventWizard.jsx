"use client";
import React, { useState, useCallback, useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../../create-event/page.module.css";
import Header from "../../create-event/_components/header/Header";
import Stepper from "../../create-event/_components/stepper/Stepper";
import StepTitleAndDesc from "../../create-event/_components/stepTitleAndDesc/StepTitleAndDesc";
import UpdateButtons from "./UpdateButtons";
import WhatsappPreview from "../../create-event/_components/whatsappPreview/WhatsappPreview";
import MobilePreviewButton from "../../create-event/_components/mobilePreviewButton/MobilePreviewButton";
import LiveEventBanner from "./LiveEventBanner";
import MobilePreviewModal from "./MobilePreviewModal";
import StaffPopup from "../../create-event/_components/staffPopup/StaffPopup";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import {
  useEventById,
  useEventSubscriptionInfo,
  useEventForm,
  mapEventToFormValues,
} from "@/hooks/events";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import useStepConfig from "../_hooks/useStepConfig";
import useUpdateEventActions from "../_hooks/useUpdateEventActions";

/**
 * Shared update-event wizard used by host and admin-dash routes.
 * Role-aware behaviour lives inside this component as branches rather
 * than a separate component tree.
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

  const [isSaving, setIsSaving] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showStaffPopup, setShowStaffPopup] = useState(false);

  const {
    methods,
    formData,
    isStepValid,
    buildStepPayload,
    locale,
    t,
    reset,
    staffList,
    addStaffMember,
    editStaffMember,
    deleteStaffMember,
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

  const eventRaw = eventData?.data?.event || eventData?.event || null;
  // When an event is `live`, every section except step 2's
  // allow-add-only branch is locked.
  const isEventLive = eventRaw?.status === "live";
  const isEventCompleted = eventRaw?.status === "completed";

  useEffect(() => {
    if (eventRaw) reset(mapEventToFormValues(eventRaw));
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

  const { handleSave, handleCancel } = useUpdateEventActions({
    eventId,
    currentStep,
    buildStepPayload,
    isStepValid,
    isEventLive,
    setIsSaving,
    router,
    buildReturnUrl,
    t,
  });

  const stepConfig = useStepConfig({ t, subscriptionInfo, eventRaw, isEventLive });

  const toggleMobilePreview = useCallback((show) => {
    setShowMobilePreview(show);
  }, []);

  if (eventLoading) {
    return <SimpleLoading message={t("loading.loading_event")} />;
  }

  const currentStepConfig = stepConfig[currentStep];
  const { Component: StepComponent, props: stepProps = {} } = currentStepConfig;

  // The lockout banner appears at the top of every step on a live
  // event. Step 2 stays interactive (allow-add-only); other steps
  // render the banner above the disabled form.
  const lockoutActive = (isEventLive && currentStep !== 2) || isEventCompleted;

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

          <div className={styles.stepper_wrapper}>
            <Stepper currentStep={currentStep} totalSteps={4} />
          </div>

          {(isEventLive || isEventCompleted) && (
            <div className={styles.header_wrapper}>
              <LiveEventBanner currentStep={currentStep} isEventCompleted={isEventCompleted} />
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
                  Button={
                    currentStep === 2 ? (
                      <Button
                        variant="secondary"
                        onClick={() => setShowStaffPopup(true)}
                        title={t("staff_button")}
                      />
                    ) : undefined
                  }
                />
                <fieldset
                  disabled={lockoutActive}
                  className={styles.fieldset_reset}
                >
                  <StepComponent {...stepProps} />
                </fieldset>
                <UpdateButtons
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaveDisabled={!isStepValid || lockoutActive}
                  isSaving={isSaving}
                  currentStep={currentStep}
                  totalSteps={4}
                />
              </form>
            </div>

            {currentStep === 4 && (
              <div className={styles.preview_wrapper}>
                <WhatsappPreview
                  eventTitle={formData.eventName || ""}
                  previewBody={formData.selectedTemplate?.bodyText || ""}
                  templateImage={
                    formData.templateImage || "/svg/events/invitation.svg"
                  }
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

          {currentStep === 4 && (
            <MobilePreviewButton onClick={() => toggleMobilePreview(true)} />
          )}

          {showMobilePreview && currentStep === 4 && (
            <MobilePreviewModal
              formData={formData}
              locale={locale}
              onClose={() => toggleMobilePreview(false)}
            />
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
