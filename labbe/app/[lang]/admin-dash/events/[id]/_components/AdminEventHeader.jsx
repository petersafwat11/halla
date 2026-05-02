"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { IoIosArrowForward } from "react-icons/io";
import { FaTrash } from "react-icons/fa";
import Image from "next/image";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import StaffPopup from "@/app/[lang]/host/create-event/_components/staffPopup/StaffPopup";
import EventActionsHeader from "@/ui/host/events/EventActionsHeader";
import { eventsAPI } from "@/services/adminDashboard";
import { cookieUtils } from "@/utils/cookieUtils";
import { toastUtils } from "@/utils/toastUtils";
import styles from "../singleEvent.module.css";

export default function AdminEventHeader({ data }) {
  const { t, i18n } = useTranslation("adminEvents");
  const { id: eventId, lang } = useParams();
  const router = useRouter();
  const [showStaffPopup, setShowStaffPopup] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isArabic = i18n.language === "ar";
  const eventTitle =
    data?.event?.title ||
    data?.eventDetails?.title ||
    t("singleEvent.title", "Event Details");
  const hostName =
    data?.host?.username || data?.host?.name || data?.hostName || "";

  // Transform event data for EventActionsHeader
  const event = {
    id: eventId,
    title: eventTitle,
    testMessageSent: data?.event?.testMessageSent || data?.testMessageSent || false,
    whatsappTemplateStatus: data?.event?.whatsappTemplateStatus || data?.whatsappTemplateStatus,
    launchSettings: data?.launchSettings || data?.event?.launchSettings,
    staffCount: (data?.staff || data?.staffList || []).length,
  };

  // Transform staff data from API format (phone) to popup format (mobile)
  const staffList = (data?.staff || data?.staffList || []).map(
    (s) => ({
      id: s._id || s.id,
      name: s.name,
      mobile: s.phone,
    })
  );

  // Dropdown items for Edit
  const dropdownItems = [
    {
      label: isArabic ? "تفاصيل المناسبة" : "Event Details",
      step: 1,
    },
    {
      label: isArabic ? "قائمة الضيوف" : "Guest List",
      step: 2,
    },
    {
      label: isArabic ? "تصميم الدعوة" : "Invitation Design",
      step: 3,
    },
    {
      label: isArabic ? "تخصيص الرسالة" : "Invitation Customization",
      step: 4,
    },
  ];

  const handleEditClick = (step) => {
    router.push(`/${lang}/admin-dash/update-event?id=${eventId}&step=${step}`);
    setShowDropdown(false);
  };

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
      const token = cookieUtils.getCookie("token");
      await eventsAPI.delete(eventId, token);
      toastUtils.success(
        t("singleEvent.deleteSuccess", "Event deleted successfully")
      );
      router.push(`/${lang}/admin-dash/events`);
    } catch (error) {
      console.error("Error deleting event:", error);
      toastUtils.error(
        error.message || t("singleEvent.deleteError", "Failed to delete event")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Staff handlers
  const handleAddStaff = async (staffMember) => {
    try {
      const token = cookieUtils.getCookie("token");
      const staffData = {
        name: staffMember.name,
        phone: staffMember.mobile,
      };
      await eventsAPI.updateEvent(
        eventId,
        {
          staffList: [
            ...staffList.map((m) => ({ name: m.name, phone: m.mobile })),
            staffData,
          ],
        },
        token
      );
      setShowStaffPopup(false);
      router.refresh();
    } catch (error) {
      console.error("Error adding staff:", error);
      throw error;
    }
  };

  const handleEditStaff = async (staffMember) => {
    try {
      const token = cookieUtils.getCookie("token");
      const updatedList = staffList.map((m) =>
        m.id === staffMember.id
          ? { name: staffMember.name, phone: staffMember.mobile }
          : { name: m.name, phone: m.mobile }
      );
      await eventsAPI.updateEvent(
        eventId,
        { staffList: updatedList },
        token
      );
      router.refresh();
    } catch (error) {
      console.error("Error editing staff:", error);
      throw error;
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      const token = cookieUtils.getCookie("token");
      const updatedList = staffList
        .filter((m) => m.id !== id)
        .map((m) => ({ name: m.name, phone: m.mobile }));
      await eventsAPI.updateEvent(
        eventId,
        { staffList: updatedList },
        token
      );
      router.refresh();
    } catch (error) {
      console.error("Error deleting staff:", error);
      throw error;
    }
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
