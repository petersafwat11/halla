"use client";
import React, { useState, useCallback } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "../../../host/create-event/page.module.css";
import Header from "../../../host/create-event/_components/header/Header";
import Stepper from "../../../host/create-event/_components/stepper/Stepper";
import StepTitleAndDesc from "../../../host/create-event/_components/stepTitleAndDesc/StepTitleAndDesc";
import StepOne from "../../../host/create-event/_components/stepOne/StepOne";
import StepTwo from "../../../host/create-event/_components/stepTwo/StepTwo";
import StepThree from "../../../host/create-event/_components/stepThree/StepThree";
import StepFour from "../../../host/create-event/_components/stepFour/StepFour";
import Summary from "../../../host/create-event/_components/summary/Summary";
import Buttons from "../../../host/create-event/_components/buttons/Buttons";
import WhatsappPreview from "../../../host/create-event/_components/whatsappPreview/WhatsappPreview";
import MobilePreviewButton from "../../../host/create-event/_components/mobilePreviewButton/MobilePreviewButton";
import StaffPopup from "../../../host/create-event/_components/staffPopup/StaffPopup";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import Button from "@/ui/commen/button/Button";
import HostSelector from "./HostSelector/HostSelector";
import EventLimitReached from "@/ui/host/subscription/EventLimitReached";
import useAuthStore from "@/stores/authStore";
import { useEventForm, buildEventPayload } from "@/hooks/events/useEventForm";
import adminDashboardAPI from "@/services/adminDashboard";
import { cookieUtils } from "@/utils/cookieUtils";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";

const WHITELABEL_ADMIN_ROLES = ["whitelabel_admin", "whitelabel_moderator"];

export default function AdminCreateEvent() {
  const { t } = useTranslation("createEvent");
  const { t: tAdmin } = useTranslation("adminEvents");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const { user, subscription: authSubscription } = useAuthStore();

  const isWhitelabelUser = user && WHITELABEL_ADMIN_ROLES.includes(user.role);

  // Merge subscription from auth store into user object for HostSelector
  const currentUserWithSubscription = user ? { ...user, subscription: authSubscription } : null;

  // Step 0 = HostSelector, steps 1-5 = event form
  const [adminStep, setAdminStep] = useState(0);
  const [selectedHost, setSelectedHost] = useState(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showStaffPopup, setShowStaffPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    handleSubmit,
  } = useEventForm({ mode: "create", totalSteps: 5 });

  // Check if the selected host/self can create events
  const canSelectedTargetCreateEvent = useCallback(() => {
    if (!selectedHost) return true;
    const sub = selectedHost.subscription;
    // Platform admins with unlimited access can always create
    if (sub?.isUnlimited) return true;
    // No subscription at all
    if (!sub) return false;
    // Subscription not active
    if (sub.status !== "active" && sub.status !== "trial") return false;
    // Check remaining events (eventsRemaining === -1 means unlimited)
    if (sub.eventsRemaining !== undefined && sub.eventsRemaining !== -1 && sub.eventsRemaining <= 0) return false;
    return true;
  }, [selectedHost]);

  const handleHostSelect = useCallback((host) => {
    setSelectedHost(host);
    setAdminStep(1);
  }, []);

  const onSubmit = useCallback(async () => {
    try {
      const payload = buildEventPayload(formData);
      const fd = new FormData();
      fd.append("eventDetails", JSON.stringify(payload.eventDetails));
      fd.append("guestList", JSON.stringify(payload.guestList));
      fd.append("staffList", JSON.stringify(payload.staffList));
      fd.append("invitationSettings", JSON.stringify(payload.invitationSettings));
      fd.append("launchSettings", JSON.stringify(payload.launchSettings));

      if (selectedHost?.createForSelf) {
        fd.append("createForSelf", "true");
      } else {
        fd.append("targetUserId", selectedHost?._id || selectedHost?.id);
      }

      if (formData.templateImage instanceof File) {
        fd.append("templateImage", formData.templateImage);
      }

      setIsSubmitting(true);
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.events.createForHost(fd, token);

      toastUtils.success(tAdmin("createEvent.success") || "Event created successfully");
      router.push(`/${locale}/admin-dash/events`);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "errors.create_failed" });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedHost, router, locale, t, tAdmin]);

  const onNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toastUtils.error(t("errors.complete_required_fields"));
      return;
    }
    if (currentStep < 5) {
      goToNextStep();
    } else {
      handleSubmit(() => onSubmit())();
    }
  }, [currentStep, handleSubmit, onSubmit, validateStep, goToNextStep, t]);

  const onPrevious = useCallback(() => {
    if (currentStep === 1) {
      setAdminStep(0);
    } else {
      goToPreviousStep();
    }
  }, [currentStep, goToPreviousStep]);

  // Step 0: HostSelector
  if (adminStep === 0) {
    return (
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          <div className={styles.header_wrapper}>
            <Header
              title={tAdmin("createEvent.title") || "Create Event (Admin)"}
              description={tAdmin("createEvent.subtitle") || "Select who to create the event for"}
              buttonText={t("promo_button")}
            />
          </div>
          <div className={styles.content_wrapper}>
            <div className={styles.form_section}>
              <HostSelector
                onHostSelect={handleHostSelect}
                selectedHost={selectedHost}
                currentUser={currentUserWithSubscription}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Block event creation if selected target has no active subscription or no remaining events
  if (adminStep >= 1 && !canSelectedTargetCreateEvent()) {
    const sub = selectedHost?.subscription;
    const eventsUsed = sub?.usage?.eventsThisMonth || 0;
    const eventsLimit = sub?.limits?.maxEventsPerMonth || sub?.eventsRemaining || 0;
    return (
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          <EventLimitReached
            subscription={{
              events: {
                used: sub ? eventsUsed : 0,
                limit: sub ? eventsLimit : 0,
              },
              planType: sub?.planType || "none",
            }}
            onUpgrade={() => {
              if (isWhitelabelUser) {
                router.push(`/${locale}/admin-dash/plans`);
              } else {
                setAdminStep(0);
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Steps 1-5: Event form
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <StepTitleAndDesc title={t("step1_title")} description={t("step1_description")} />
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
            <StepTwo subscription={selectedHost?.subscription} />
          </>
        );
      case 3:
        return (
          <>
            <StepTitleAndDesc title={t("step3_title")} description={t("step3_description")} />
            <StepThree />
          </>
        );
      case 4:
        return (
          <>
            <StepTitleAndDesc title={t("step4_title")} description={t("step4_description")} />
            <StepFour />
          </>
        );
      case 5:
        return (
          <>
            <StepTitleAndDesc title={t("step5_title")} description={t("step5_description")} />
            <Summary />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          <div className={styles.header_wrapper}>
            <Header
              title={tAdmin("createEvent.title") || "Create Event (Admin)"}
              description={
                selectedHost
                  ? `${tAdmin("createEvent.creatingFor") || "Creating for:"} ${selectedHost.username || selectedHost.name || selectedHost.phoneNumber}`
                  : t("page_description")
              }
              buttonText={t("promo_button")}
            />
          </div>

          <div className={styles.stepper_wrapper}>
            <Stepper currentStep={currentStep} />
          </div>

          <div className={styles.content_wrapper}>
            <div className={`${styles.form_section} ${currentStep === 4 ? styles.form_section_wide : ""}`}>
              <form className={styles.form_card} onSubmit={(e) => e.preventDefault()}>
                {renderStepContent()}
                <Buttons
                  onNext={onNext}
                  onPrevious={onPrevious}
                  isNextDisabled={!isStepValid || isSubmitting}
                  showPrevious={true}
                  isLoading={isSubmitting}
                />
              </form>
            </div>

            {currentStep === 4 && (
              <WhatsappPreview
                eventTitle={formData.eventName || ""}
                invitationMessage={formData.invitationMessage || ""}
                templateImage={formData.templateImage || formData.selectedTemplate?.image || "/svg/events/invitation.svg"}
                templateData={formData.selectedTemplate?.data || {}}
                locale={locale}
              />
            )}
          </div>

          {currentStep === 4 && (
            <MobilePreviewButton onClick={() => setShowMobilePreview(true)} />
          )}

          {showMobilePreview && currentStep === 4 && (
            <div className={styles.modal_overlay} onClick={() => setShowMobilePreview(false)}>
              <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modal_close} onClick={() => setShowMobilePreview(false)} type="button">
                  &times;
                </button>
                <WhatsappPreview
                  eventTitle={formData.eventName || ""}
                  invitationMessage={formData.invitationMessage || ""}
                  templateImage={formData.templateImage || formData.selectedTemplate?.image || "/svg/events/invitation.svg"}
                  templateData={formData.selectedTemplate?.data || {}}
                  locale={locale}
                  forceShow={true}
                />
              </div>
            </div>
          )}

          <PopupWrapper isOpen={showStaffPopup} onClose={() => setShowStaffPopup(false)}>
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
}
