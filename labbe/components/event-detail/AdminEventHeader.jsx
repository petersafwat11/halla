"use client";
import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import { FaTrash } from "react-icons/fa";
import Image from "next/image";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import StaffPopup from "@/app/[lang]/host/create-event/_components/staffPopup/StaffPopup";
import EventActionsHeader from "@/ui/host/events/EventActionsHeader";
import { useAdminEventMutation } from "@/hooks/admin";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
// Admin-specific classes (`outlineButton`, `dangerButton`) live in the
// admin page's CSS module — we reference it by absolute path so this
// component can live in the shared `components/event-detail/` folder.
import styles from "@/app/[lang]/admin-dash/events/[id]/singleEvent.module.css";

export default function AdminEventHeader({ data }) {
  const { t, i18n } = useTranslation("adminEvents");
  const { id: eventId, lang } = useParams();
  const router = useRouter();
  const [showStaffPopup, setShowStaffPopup] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteEvent = useAdminEventMutation("delete");
  const updateEvent = useAdminEventMutation("update");

  const isArabic = i18n.language === "ar";
  const eventTitle =
    data?.event?.title ||
    t("singleEvent.title", "Event Details");
  const hostName =
    data?.host?.name || data?.host?.username || "";

  // Spread the full event so every field the shared `useEventActionGate`
  // hook reads (`taqnyatTemplate`, `status`, `launchSettings`,
  // `staffList`, …) reaches `EventActionsHeader`. A hand-picked
  // projection that drops `taqnyatTemplate` + `status` makes
  // `hasTemplate=false` and silently hides every action button on the admin
  // single-event page.
  const event = {
    ...(data?.event || {}),
    id: eventId,
    title: eventTitle,
    staffCount: (data?.staff || []).length,
  };

  // Shape staff for StaffPopup which reads `id`, `name`, `phone`.
  const staffList = (data?.staff || []).map((s) => ({
    id: s._id || s.id,
    name: s.name,
    phone: s.phone,
  }));

  // Dropdown items for Edit
  const dropdownItems = [
    { label: t("singleEvent.editSteps.details", "تفاصيل المناسبة"), step: 1 },
    { label: t("singleEvent.editSteps.guestList", "قائمة الضيوف"), step: 2 },
    { label: t("singleEvent.editSteps.design", "تصميم الدعوة"), step: 3 },
    { label: t("singleEvent.editSteps.customization", "تخصيص الرسالة"), step: 4 },
  ];

  const handleEditClick = useCallback((step) => {
    router.push(`/${lang}/admin-dash/update-event?id=${eventId}&step=${step}`);
    setShowDropdown(false);
  }, [router, lang, eventId]);

  const handleDeleteEvent = async () => {
    const confirmed = window.confirm(
      t(
        "singleEvent.confirmDelete.message",
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteEvent.mutateAsync(eventId);
      toastUtils.success(
        t("singleEvent.deleteSuccess", "Event deleted successfully")
      );
      router.push(`/${lang}/admin-dash/events`);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "singleEvent.deleteError" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Staff handlers
  const handleAddStaff = async (staffMember) => {
    const phone = staffMember.phone ?? staffMember.mobile;
    const staffData = { name: staffMember.name, phone };
    await updateEvent.mutateAsync({
      eventId,
      data: {
        staffList: [
          ...staffList.map((m) => ({ name: m.name, phone: m.phone })),
          staffData,
        ],
      },
    });
    setShowStaffPopup(false);
    router.refresh();
  };

  const handleEditStaff = async (staffMember) => {
    const phone = staffMember.phone ?? staffMember.mobile;
    const updatedList = staffList.map((m) =>
      m.id === staffMember.id
        ? { name: staffMember.name, phone }
        : { name: m.name, phone: m.phone }
    );
    await updateEvent.mutateAsync({ eventId, data: { staffList: updatedList } });
    router.refresh();
  };

  const handleDeleteStaff = async (id) => {
    const updatedList = staffList
      .filter((m) => m.id !== id)
      .map((m) => ({ name: m.name, phone: m.phone }));
    await updateEvent.mutateAsync({ eventId, data: { staffList: updatedList } });
    router.refresh();
  };

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <IoIosArrowForward
              onClick={() => router.push(`/${lang}/admin-dash/events`)}
              className={styles.backButton}
              style={{
                transform: isArabic ? "rotate(0deg)" : "rotate(180deg)",
              }}
            />
            {eventTitle}
            {hostName && (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "normal",
                  color: "#656565",
                  marginInlineStart: "8px",
                }}
              >
                (
                {t("singleEvent.hostInfo", { hostName }) || `Host: ${hostName}`}
                )
              </span>
            )}
          </h1>
        </div>

        <div className={styles.actions}>
          <EventActionsHeader event={event} isAdmin={true} />

          {/* Moderators */}
           <button
            className={styles.outlineButton}
            onClick={() => setShowStaffPopup(true)}
          >
            <span>{t("singleEvent.actions.staff", "Staff")}</span>
          </button>

          {/* Delete Button */}
          <button
            className={styles.dangerButton}
            onClick={handleDeleteEvent}
            disabled={isDeleting}
          >
            {isDeleting ? t("loading", "Loading...") : (
              <>
                 <FaTrash size={16} />
                 <span>{t("singleEvent.actions.delete", "Delete")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <PopupWrapper
        isOpen={showStaffPopup}
        onClose={() => setShowStaffPopup(false)}
      >
        <StaffPopup
          staffList={staffList}
          onAdd={handleAddStaff}
          onEdit={handleEditStaff}
          onDelete={handleDeleteStaff}
          onClose={() => setShowStaffPopup(false)}
        />
      </PopupWrapper>
    </>
  );
}
