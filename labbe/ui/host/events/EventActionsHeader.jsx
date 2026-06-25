"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import TestMessagePopup from "@/ui/host/main-page/TestMessagePopup";
import ScheduleSendingPopup from "@/ui/host/popups/scheduleSendingPopup/ScheduleSendingPopup";
import { useEventMutation } from "@/hooks/events";
import { toast } from "react-toastify";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import { useEventActionGate } from "@halla/shared/hooks/useEventActionGate";
import styles from "./EventActionsHeader.module.css";

export default function EventActionsHeader({ event, isAdmin = false }) {
  const { t } = useTranslation("home-events");
  const router = useRouter();
  const { currentLocale } = UseLanguageChange();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [showTestMessagePopup, setShowTestMessagePopup] = useState(false);
  const [testMessageSent, setTestMessageSent] = useState(event?.testMessageSent || false);

  const notifyStaffMutation = useEventMutation("notifyStaff");

  // Resolve the event ID robustly — Mongoose virtual `id` OR raw `_id`
  const effectiveEventId = event?.id?.toString() || event?._id?.toString();

  // Gate logic centralised in `useEventActionGate` so the header, the
  // dashboard widget, and the mobile companions all resolve action
  // visibility identically. (Manual-retry RBAC stays in
  // `EventFailureBanner`; here we only need the test/schedule/staff
  // gates so the existing `event` prop is enough.)
  const { canSendTest, canSchedule, hasStaff, isCompleted } =
    useEventActionGate({ event, testMessageSent });

  const dropdownItems = [
    { label: t("lastEvent.dropdown.eventDetails"), step: 1 },
    { label: t("lastEvent.dropdown.guestList"), step: 2 },
    { label: t("lastEvent.dropdown.invitationDesign"), step: 3 },
    { label: t("lastEvent.dropdown.invitationCustomization"), step: 4 },
  ];

  const handleEditClick = (step) => {
    const basePath = isAdmin ? "admin-dash" : "host";
    router.push(`/${currentLocale}/${basePath}/update-event?id=${effectiveEventId}&step=${step}`);
    setShowDropdown(false);
  };

  const handleScheduleClick = () => setShowSchedulePopup(true);
  const handleTestMessageClick = () => setShowTestMessagePopup(true);

  const handleTestMessageSuccess = () => {
    setTestMessageSent(true);
    setShowTestMessagePopup(false);
    router.refresh();
  };

  const handleNotifyStaff = async () => {
    if (!effectiveEventId) return;
    try {
      const result = await notifyStaffMutation.mutateAsync({ eventId: effectiveEventId });
      const data = result?.data || result;
      const sent = data?.sent || 0;
      const total = data?.total || 0;
      const firstError = data?.results?.find((r) => r.status === "failed")?.error;

      if (sent === 0 && total > 0) {
        // Provider rejected every send — surface the actual reason (e.g.
        // taqnyat IP allowlist 403) instead of a misleading success toast.
        toast.error(firstError || t("staff.notifyError"));
      } else if (sent < total) {
        toast.warn(
          t("staff.notifyPartial", { sent, total, error: firstError || "" })
        );
      } else {
        toast.success(t("staff.notifySuccess", { sent, total }));
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || t("staff.notifyError")
      );
    }
  };

  return (
    <>
      <div className={styles.actionsContainer}>
        {canSendTest && (
          <button className={`${styles.outlineButton} ${styles.flashingButton}`} onClick={handleTestMessageClick}>
            <span>{t("lastEvent.buttons.testMessage")}</span>
            <Image src="/svg/events/calendar-edit.svg" alt="test" width={12} height={12} />
          </button>
        )}
        {canSchedule && (
          <button className={styles.outlineButton} onClick={handleScheduleClick}>
            <span>{t("lastEvent.buttons.scheduleEvent")}</span>
            <Image src="/svg/events/calendar-edit.svg" alt="calendar" width={12} height={12} />
          </button>
        )}
        {hasStaff && (
          <button
            className={styles.outlineButton}
            onClick={handleNotifyStaff}
            disabled={notifyStaffMutation.isPending}
          >
            <span>
              {notifyStaffMutation.isPending
                ? t("staff.notifying", "Sending...")
                : t("staff.notifyStaff", "Notify Staff")}
            </span>
          </button>
        )}
        {isCompleted && (
          <button
            className={styles.outlineButton}
            onClick={() =>
              router.push(
                `/${currentLocale}/${isAdmin ? "admin-dash" : "host"}/post-event/${effectiveEventId}`
              )
            }
          >
            <span>{t("lastEvent.buttons.sharePostEvent", "مشاركة صفحة ما بعد المناسبة")}</span>
          </button>
        )}
        {!isCompleted && (
          <div className={styles.dropdownWrapper}>
            <button className={styles.primaryButton} onClick={() => setShowDropdown(!showDropdown)}>
              <Image src="/svg/events/edit.svg" alt="edit" width={12} height={12} />
              <span>{t("lastEvent.editEvent")}</span>
              <Image
                src="/svg/events/arrow-down.svg"
                alt="arrow-down"
                width={12}
                height={12}
                style={{ transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            </button>
            {showDropdown && (
              <div className={styles.dropdown}>
                {dropdownItems.map((item) => (
                  <button key={item.step} className={styles.dropdownItem} onClick={() => handleEditClick(item.step)}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PopupWrapper isOpen={showTestMessagePopup} onClose={() => setShowTestMessagePopup(false)}>
        <TestMessagePopup
          onConfirm={handleTestMessageSuccess}
          onCancel={() => setShowTestMessagePopup(false)}
          eventId={effectiveEventId}
        />
      </PopupWrapper>

      <PopupWrapper isOpen={showSchedulePopup} onClose={() => setShowSchedulePopup(false)}>
        <ScheduleSendingPopup
          onClose={() => setShowSchedulePopup(false)}
          eventId={effectiveEventId}
          onSuccess={() => router.refresh()}
          existingSchedule={event?.launchSettings}
          eventDate={event?.eventDetails?.date}
        />
      </PopupWrapper>
    </>
  );
}
