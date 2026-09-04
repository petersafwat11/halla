"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { FormProvider } from "react-hook-form";
import { useRouter } from "next/navigation";
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
import { useAdminEventMutation } from "@/hooks/admin";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";

/**
 * Normalize subscription from any source into the canonical shape
 * that StepTwo and GuestQuotaCounter expect.
 *
 * Sources:
 *  - Platform admin self: { isUnlimited: true }
 *  - Backend getEventTargets: { status, planType, isSingleEvent, isPoolPlan, guestLimit, isGuestUnlimited, ... }
 *  - Auth store getSummary: { status, planType, limits, maxGuests, invitePool, invitesRemaining, ... }
 */
function normalizeSubscription(sub) {
  if (!sub) return null;
  if (sub.isUnlimited) {
    return {
      isUnlimited: true,
      guestLimit: -1,
      isGuestUnlimited: true,
      isPoolPlan: false,
      isSingleEvent: false,
      invitePool: null,
      invitesRemaining: null,
      eventsRemaining: -1,
      eventsUsed: 0,
    };
  }
  // Already normalized (from getEventTargets / getUserSubscriptionInfo)
  if (sub.isGuestUnlimited !== undefined && sub.guestLimit !== undefined) {
    return {
      isUnlimited: false,
      guestLimit: sub.guestLimit,
      isGuestUnlimited: sub.isGuestUnlimited,
      isPoolPlan: sub.isPoolPlan ?? false,
      isSingleEvent: sub.isSingleEvent ?? false,
      invitePool: sub.invitePool ?? null,
      invitesRemaining: sub.invitesRemaining ?? null,
      eventsRemaining: sub.eventsRemaining ?? 0,
      eventsUsed: sub.eventsUsed ?? 0,
    };
  }
  // From auth store getSummary() — has limits.maxInvitesPerEvent and maxGuests
  const limits = sub.limits || {};
  const isPerEvent = sub.isSingleEvent === true;
  const isPool = sub.isPoolSubscription === true;

  let guestLimit, isGuestUnlimited, invitePool, invitesRemaining;
  if (isPerEvent) {
    guestLimit = limits.maxInvitesPerEvent ?? 50;
    isGuestUnlimited = guestLimit === -1;
    invitePool = null;
    invitesRemaining = null;
  } else if (isPool) {
    guestLimit = -1;
    isGuestUnlimited = true;
    invitePool = sub.invitePool ?? null;
    invitesRemaining = sub.invitesRemaining ?? null;
  } else {
    guestLimit = limits.maxInvitesPerEvent ?? 50;
    isGuestUnlimited = guestLimit === -1;
    invitePool = sub.invitePool ?? null;
    invitesRemaining = sub.invitesRemaining ?? null;
  }

  return {
    isUnlimited: false,
    guestLimit,
    isGuestUnlimited,
    isPoolPlan: isPool,
    isSingleEvent: isPerEvent,
    invitePool,
    invitesRemaining,
    eventsRemaining: sub.eventsRemaining ?? 0,
    eventsUsed: sub.usage?.eventsCreated ?? 0,
  };
}

export default function AdminCreateEvent() {
  const { t } = useTranslation("createEvent");
  const { t: tAdmin } = useTranslation("adminEvents");
  const router = useRouter();

  const { user, subscription: authSubscription } = useAuthStore();

  // Merge subscription from auth store into user object for HostSelector
  const currentUserWithSubscription = user ? { ...user, subscription: authSubscription } : null;

  // Step 0 = HostSelector, steps 1-5 = event form.
  const [adminStep, setAdminStep] = useState(0);
  const [selectedHost, setSelectedHost] = useState(null);

  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showStaffPopup, setShowStaffPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const idempotencyKeyRef = useRef(null);
  const isSubmittingRef = useRef(false);

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
    handleSubmit,
  } = useEventForm({ mode: "create", totalSteps: 5 });

  // Invalidate idempotency key whenever any field is edited
  useEffect(() => {
    const subscription = methods.watch(() => {
      idempotencyKeyRef.current = null;
    });
    return () => subscription.unsubscribe();
  }, [methods]);

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [staffList, selectedHost]);

  const createForHost = useAdminEventMutation("createForHost");

  // Check if the selected host/self can create events
  const canSelectedTargetCreateEvent = useCallback(() => {
    if (!selectedHost) return true;
    const sub = normalizeSubscription(selectedHost.subscription);
    if (!sub) return false;
    if (sub.isUnlimited) return true;
    if (sub.eventsRemaining === -1) return true;
    if (sub.eventsRemaining <= 0) return false;
    return true;
  }, [selectedHost]);

  const handleHostSelect = useCallback((host) => {
    setSelectedHost(host);
    setAdminStep(1);
  }, []);

  const onSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setElapsedSeconds(0);

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    try {
      const payload = buildEventPayload(formData);
      const fd = new FormData();
      fd.append("eventDetails", JSON.stringify(payload.eventDetails));
      fd.append("guestList", JSON.stringify(payload.guestList));
      fd.append("staffList", JSON.stringify(payload.staffList));
      if (payload.visualTemplate)
        fd.append("visualTemplate", JSON.stringify(payload.visualTemplate));
      if (payload.taqnyatTemplate)
        fd.append("taqnyatTemplate", JSON.stringify(payload.taqnyatTemplate));
      if (payload.guestReplies)
        fd.append("guestReplies", JSON.stringify(payload.guestReplies));
      if (payload.invitationType)
        fd.append("invitationType", payload.invitationType);
      fd.append("launchSettings", JSON.stringify(payload.launchSettings));

      if (selectedHost?.createForSelf) {
        fd.append("createForSelf", "true");
      } else {
        fd.append("targetUserId", selectedHost?._id || selectedHost?.id);
        fd.append("targetType", selectedHost?.targetType || "host");
      }

      if (formData.templateImage instanceof File) {
        fd.append("templateImage", formData.templateImage);
      }

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `admin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }

      await createForHost.mutateAsync({
        data: fd,
        idempotencyKey: idempotencyKeyRef.current,
      });

      toastUtils.success(tAdmin("createEvent.success.created") || "Event created successfully");
      idempotencyKeyRef.current = null;
      router.push(`/${locale}/admin-dash/events`);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "errors.create_failed", language: locale });
    } finally {
      clearInterval(timer);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setElapsedSeconds(0);
    }
  }, [formData, selectedHost, createForHost, router, locale, t, tAdmin]);

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
    const sub = normalizeSubscription(selectedHost?.subscription);
    const eventsUsed = sub?.eventsUsed ?? 0;
    const eventsLimit = sub?.eventsRemaining === -1 ? -1 : (sub?.eventsUsed ?? 0) + (sub?.eventsRemaining ?? 0);
    return (
      <div className={styles.page_container}>
        <div className={styles.main_content}>
        <EventLimitReached
          subscription={{
            events: {
              used: eventsUsed,
              limit: eventsLimit,
            },
            planType: sub?.planType || "none",
          }}
            onUpgrade={() => {
              setAdminStep(0);
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
            <StepTwo subscription={normalizeSubscription(selectedHost?.subscription)} />
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
                  ? `${tAdmin("createEvent.creatingFor") || "Creating for:"} ${selectedHost.name || selectedHost.phoneNumber}`
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
                {isSubmitting && elapsedSeconds >= 5 && (
                  <p
                    style={{
                      marginTop: "12px",
                      color: "#6b7280",
                      fontSize: "14px",
                      textAlign: "center",
                      lineHeight: "1.5",
                    }}
                  >
                    {locale === "ar"
                      ? "جاري معالجة الطلب، قد يستغرق إنشاء المناسبة وقتاً أطول من المعتاد... بياناتك محفوظة بأمان."
                      : "Processing your request, creating the event may take a little longer... your data is safe."}
                  </p>
                )}
              </form>
            </div>

            {currentStep === 4 && (
              <WhatsappPreview
                eventTitle={formData.eventName || ""}
                previewBody={formData.selectedTemplate?.bodyText || ""}
                templateImage={formData.templateImage || formData.selectedTemplate?.image || "/svg/events/invitation.svg"}
                templateData={formData.selectedTemplate?.data || {}}
                selectedTemplate={formData.selectedTemplate}
                eventDate={formData.eventDate || ""}
                eventTime={formData.eventTime || ""}
                locationAddress={formData.address?.address || ""}
                locale={locale}
                invitationType={formData.invitationType}
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
                  previewBody={formData.selectedTemplate?.bodyText || ""}
                  templateImage={formData.templateImage || formData.selectedTemplate?.image || "/svg/events/invitation.svg"}
                  templateData={formData.selectedTemplate?.data || {}}
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
