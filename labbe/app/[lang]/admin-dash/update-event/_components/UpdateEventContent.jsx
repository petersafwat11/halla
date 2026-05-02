"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "../../../host/create-event/page.module.css";
import Header from "../../../host/create-event/_components/header/Header";
import StepTitleAndDesc from "../../../host/create-event/_components/stepTitleAndDesc/StepTitleAndDesc";
import StepOne from "../../../host/create-event/_components/stepOne/StepOne";
import StepTwo from "../../../host/create-event/_components/stepTwo/StepTwo";
import StepThree from "../../../host/create-event/_components/stepThree/StepThree";
import StepFour from "../../../host/create-event/_components/stepFour/StepFour";
import UpdateButtons from "../../../host/update-event/_components/UpdateButtons";
import WhatsappPreview from "../../../host/create-event/_components/whatsappPreview/WhatsappPreview";
import MobilePreviewButton from "../../../host/create-event/_components/mobilePreviewButton/MobilePreviewButton";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { toastUtils } from "@/utils/toastUtils";
import adminDashboardAPI from "@/services/adminDashboard";
import { cookieUtils } from "@/utils/cookieUtils";

const DEFAULT_ADDRESS = {
  address: "",
  latitude: 24.7136,
  longitude: 46.6753,
  city: "",
  country: "",
};

const DEFAULT_FORM_VALUES = {
  eventType: "",
  eventName: "",
  eventDate: "",
  eventTime: "12:00:AM",
  address: DEFAULT_ADDRESS,
  guestList: [],
  staffList: [],
  selectedTemplate: null,
  templateImage: "",
  invitationMessage: "",
  attendanceAutoReply: "",
  absenceAutoReply: "",
  expectedAttendanceAutoReply: "",
  note: "",
};

const transformGuestList = (guests = []) =>
  guests.map((guest) => ({
    id: guest._id || guest.id || Date.now() + Math.random(),
    name: guest.name || "",
    mobile: guest.phone || "",
    email: guest.email || "",
  }));

const transformStaffList = (staff = []) =>
  staff.map((s) => ({
    id: s._id || s.id || Date.now() + Math.random(),
    name: s.name || "",
    mobile: s.phone || "",
  }));

const mapEventToFormValues = (event) => ({
  eventType: event.eventDetails?.type || "",
  eventName: event.eventDetails?.title || "",
  eventDate: event.eventDetails?.date || "",
  eventTime: event.eventDetails?.time || "12:00:AM",
  address: event.eventDetails?.location || DEFAULT_ADDRESS,
  guestList: transformGuestList(event.guestList),
  staffList: transformStaffList(event.staffList),
  selectedTemplate: event.invitationSettings?.selectedTemplate || null,
  templateImage: event.invitationSettings?.templateImage || "",
  invitationMessage: event.invitationSettings?.invitationMessage || "",
  attendanceAutoReply: event.invitationSettings?.attendanceAutoReply || "",
  absenceAutoReply: event.invitationSettings?.absenceAutoReply || "",
  expectedAttendanceAutoReply:
    event.invitationSettings?.expectedAttendanceAutoReply || "",
  note: event.invitationSettings?.note || "",
});

export default function UpdateEventContent({ eventId }) {
  const { t } = useTranslation("adminEvents");
  const router = useRouter();
  const pathname = usePathname();

  const currentStep = 1; // Admin updates all at once, no steps
  const locale = pathname.split("/")[1];

  const [pageState, setPageState] = useState({
    isLoading: true,
    isSaving: false,
    showMobilePreview: false,
  });
  const [eventData, setEventData] = useState(null);
  const [hostInfo, setHostInfo] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const methods = useForm({
    mode: "onChange",
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { watch, reset } = methods;
  const formData = watch();

  // Fetch event data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        toastUtils.error(
          t("updateEvent.errors.missingId") || "Event ID is missing"
        );
        router.push(`/${locale}/admin-dash/events`);
        return;
      }

      try {
        const token = cookieUtils.getCookie("token");
        const eventResponse = await adminDashboardAPI.events.getById(
          eventId,
          token
        );

        const event =
          eventResponse.data?.event ||
          eventResponse.event ||
          eventResponse.data ||
          eventResponse;

        setEventData(event);
        reset(mapEventToFormValues(event));

        // Extract host info if available
        if (event.host) {
          setHostInfo(event.host);
        }

        // Extract subscription info if available
        if (event.subscription) {
          setSubscriptionInfo(event.subscription);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        toastUtils.error(
          t("updateEvent.errors.loadFailed") || "Failed to load event data"
        );
        router.push(`/${locale}/admin-dash/events`);
      } finally {
        setPageState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchData();
  }, [eventId, locale, reset, router, t]);

  // Validation for form
  const isFormValid = useMemo(() => {
    return (
      formData.eventType &&
      formData.eventName &&
      formData.eventDate &&
      formData.eventTime &&
      formData.guestList?.length > 0 &&
      formData.selectedTemplate !== null &&
      formData.invitationMessage?.trim()
    );
  }, [
    formData.eventType,
    formData.eventName,
    formData.eventDate,
    formData.eventTime,
    formData.guestList?.length,
    formData.selectedTemplate,
    formData.invitationMessage,
  ]);

  // Build complete update payload
  const buildUpdatePayload = useCallback(() => {
    return {
      eventDetails: {
        title: formData.eventName,
        type: formData.eventType,
        date: formData.eventDate,
        time: formData.eventTime,
        location: formData.address,
        description: "",
      },
      guestList: (formData.guestList || []).map((guest) => ({
        name: guest.name,
        phone: guest.mobile || guest.phone || "",
        email: guest.email || "",
      })),
      staffList: (formData.staffList || []).map((s) => ({
        name: s.name,
        phone: s.mobile || s.phone || "",
      })),
      invitationSettings: {
        selectedTemplate: formData.selectedTemplate,
        invitationMessage: formData.invitationMessage,
        attendanceAutoReply: formData.attendanceAutoReply,
        absenceAutoReply: formData.absenceAutoReply,
        expectedAttendanceAutoReply: formData.expectedAttendanceAutoReply,
        note: formData.note,
        ...(formData.templateImage instanceof File && {
          templateImage: formData.templateImage,
        }),
      },
    };
  }, [formData]);

  // Update event using admin API - send FormData with JSON-stringified fields
  const updateEvent = useCallback(async () => {
    if (!eventId) return;

    const payload = buildUpdatePayload();
    setPageState((prev) => ({ ...prev, isSaving: true }));

    try {
      const token = cookieUtils.getCookie("token");

      const fd = new FormData();
      fd.append("eventDetails", JSON.stringify(payload.eventDetails));
      fd.append("guestList", JSON.stringify(payload.guestList));
      fd.append("staffList", JSON.stringify(payload.staffList));

      // Separate templateImage file from invitationSettings
      const { templateImage, ...invSettings } = payload.invitationSettings;
      fd.append("invitationSettings", JSON.stringify(invSettings));
      if (templateImage instanceof File) {
        fd.append("templateImage", templateImage);
      }

      await adminDashboardAPI.events.updateEvent(eventId, fd, token);

      toastUtils.success(
        t("updateEvent.success.updated") || "Event updated successfully"
      );
      router.push(`/${locale}/admin-dash/events`);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        t("updateEvent.errors.updateFailed") ||
        "Failed to update event. Please try again.";
      toastUtils.error(errorMessage);
    } finally {
      setPageState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [eventId, buildUpdatePayload, router, locale, t]);

  const handleSave = useCallback(async () => {
    if (!isFormValid) {
      toastUtils.error(
        t("updateEvent.errors.fillRequired") ||
          "Please fill all required fields"
      );
      return;
    }

    await updateEvent();
  }, [isFormValid, updateEvent, t]);

  const handleCancel = useCallback(() => {
    router.push(`/${locale}/admin-dash/events`);
  }, [router, locale]);

  const toggleMobilePreview = useCallback((show) => {
    setPageState((prev) => ({ ...prev, showMobilePreview: show }));
  }, []);

  if (pageState.isLoading) {
    return <SimpleLoading />;
  }

  return (
    <FormProvider {...methods}>
      <div className={styles.page_container}>
        <div className={styles.main_content}>
          <div className={styles.header_wrapper}>
            <Header
              title={t("updateEvent.title") || "Update Event (Admin)"}
              description={
                hostInfo
                  ? `${t("updateEvent.hostInfo") || "Host:"} ${
                      hostInfo.username || hostInfo.name || hostInfo.phoneNumber
                    }`
                  : t("updateEvent.subtitle") || "Edit event details"
              }
              buttonText={
                t("updateEvent.inviteButton") || "Your invitation is on us"
              }
            />
          </div>

          <div className={styles.content_wrapper}>
            <div className={styles.form_section}>
              <form
                className={styles.form_card}
                onSubmit={(e) => e.preventDefault()}
              >
                <StepTitleAndDesc
                  title={t("updateEvent.steps.eventDetails") || "Event Details"}
                  description={
                    t("updateEvent.steps.eventDetailsDesc") || "Edit event information"
                  }
                />
                <StepOne />

                <StepTitleAndDesc
                  title={t("updateEvent.steps.guestList") || "Guest List"}
                  description={
                    t("updateEvent.steps.guestListDesc") || "Manage guests and staff"
                  }
                />
                <StepTwo subscription={subscriptionInfo} />

                <StepTitleAndDesc
                  title={t("updateEvent.steps.template") || "Invitation Design"}
                  description={
                    t("updateEvent.steps.templateDesc") || "Choose invitation template"
                  }
                />
                <StepThree />

                <StepTitleAndDesc
                  title={t("updateEvent.steps.messages") || "Customize Message"}
                  description={
                    t("updateEvent.steps.messagesDesc") || "Edit invitation messages"
                  }
                />
                <StepFour />

                <UpdateButtons
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaveDisabled={!isFormValid}
                  isSaving={pageState.isSaving}
                  currentStep={1}
                  totalSteps={1}
                />
              </form>
            </div>

            <WhatsappPreview
              eventTitle={formData.eventName || ""}
              invitationMessage={formData.invitationMessage || ""}
              templateImage={
                formData.templateImage ||
                formData.selectedTemplate?.image ||
                "/svg/events/invitation.svg"
              }
              templateData={formData.selectedTemplate?.data || {}}
              locale={locale}
            />
          </div>

          <MobilePreviewButton onClick={() => toggleMobilePreview(true)} />

          {pageState.showMobilePreview && (
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
                  invitationMessage={formData.invitationMessage || ""}
                  templateImage={
                    formData.templateImage ||
                    formData.selectedTemplate?.image ||
                    "/svg/events/invitation.svg"
                  }
                  templateData={formData.selectedTemplate?.data || {}}
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
}
