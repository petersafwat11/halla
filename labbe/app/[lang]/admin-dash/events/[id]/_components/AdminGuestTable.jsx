"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import PopupWrapper from "@/ui/host/popups/popupWrapper/PopupWrapper";
import AddGuestPopup from "@/ui/host/popups/addGuestPopup/AddGuestPopup";
import ReminderPopup from "@/ui/host/popups/reminderPopup/ReminderPopup";
import SendInvitationPopup from "@/ui/host/popups/sendInvitationPopup/SendInvitationPopup";
import styles from "../singleEvent.module.css";
import { cookieUtils } from "@/utils/cookieUtils";
import { eventsAPI } from "@/services/adminDashboard";
import messagingService from "@/services/messaging";

export default function AdminGuestTable({ data }) {
  const { t, i18n } = useTranslation("adminEvents");
  const router = useRouter();
  const { id: eventId, lang } = useParams();
  const isArabic = i18n.language === "ar";

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [showInvitationPopup, setShowInvitationPopup] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState([]);

  const guests = data.guests;

  const handleExportGuests = async () => {
    try {
      const token = cookieUtils.getCookie("token");
      await eventsAPI.exportGuests(eventId, token);
      toastUtils.success(
        t(
          "singleEvent.guestTable.exportSuccess",
          "Guests exported successfully"
        )
      );
    } catch (error) {
      handleError(error, t, { fallbackMessage: "singleEvent.guestTable.exportError" });
    }
  };

  const handleEditGuest = (guest) => {
    setEditingGuest(guest);
    setShowEditPopup(true);
  };

  const handleDeleteGuest = async (guest, e) => {
    if (e) {
      e.stopPropagation();
    }

    if (!guest.guestId && !guest._id) {
      toastUtils.error(t("errors.noGuestId", "Guest ID not found"));
      return;
    }

    if (
      !window.confirm(
        t(
          "singleEvent.guestTable.confirmDelete",
          "Are you sure you want to delete this guest?"
        )
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const token = cookieUtils.getCookie("token");
      const guestId = guest.guestId || guest._id;
      await eventsAPI.deleteGuest(eventId, guestId, token);

      toastUtils.success(
        t("singleEvent.guestTable.deleteSuccess", "Guest deleted successfully")
      );
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "singleEvent.guestTable.deleteError" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateGuest = async (guestId, guestData) => {
    try {
      const token = cookieUtils.getCookie("token");
      await eventsAPI.updateGuest(eventId, guestId, guestData, token);
      setShowEditPopup(false);
      setEditingGuest(null);
      toastUtils.success(
        t("singleEvent.guestTable.updateSuccess", "Guest updated successfully")
      );
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "singleEvent.guestTable.updateError" });
      throw error;
    }
  };

  const handleCloseEditPopup = () => {
    setShowEditPopup(false);
    setEditingGuest(null);
  };

  const handleSendReminder = () => {
    setShowReminderPopup(true);
  };

  const handleCloseReminderPopup = () => {
    setShowReminderPopup(false);
  };

  const handleConfirmReminder = async (message) => {
    try {
      await messagingService.sendReminder(eventId, "sms", lang || "ar", message);
      toastUtils.success(t("reminderPopup.success", "Reminder sent successfully"));
      setShowReminderPopup(false);
    } catch (error) {
      handleError(error, t, { fallbackMessage: "reminderPopup.error" });
    }
  };

  const handleSendInvitation = () => {
    const guestsWithPhone = guests.filter((g) => g.phone && g.phone !== "-");
    if (guestsWithPhone.length === 0) {
      toastUtils.error(t("messaging.noGuestsWithPhone", "لا يوجد ضيوف لديهم أرقام هواتف"));
      return;
    }
    setSelectedGuests(guestsWithPhone.map((g) => g.guestId || g._id));
    setShowInvitationPopup(true);
  };

  const handleConfirmSendInvitation = async (channel) => {
    if (selectedGuests.length === 0) return;

    setIsSendingInvitation(true);
    try {
      const result = await messagingService.sendBulkInvitations(
        selectedGuests,
        eventId,
        channel,
        lang || "ar"
      );

      if (result.status === "success") {
        toastUtils.success(
          t("messaging.invitationsSent", {
            count: result.data?.successful || selectedGuests.length,
          }) || `تم إرسال ${result.data?.successful || selectedGuests.length} دعوة بنجاح`
        );
      }
      setShowInvitationPopup(false);
      setSelectedGuests([]);
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "messaging.sendError" });
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleCloseInvitationPopup = () => {
    setShowInvitationPopup(false);
    setSelectedGuests([]);
  };

  return (
    <>
      <div className={styles.rightCol}>
        <Table
          title={t("singleEvent.guestTable.title", "قائمة الضيوف")}
          headers={[
            t("table.columns.guestName", "اسم العميل"),
            t("table.columns.mobile", "رقم الجوال"),
            t("table.columns.email", "البريد الإلكتروني"),
            t("table.columns.addedBy", "إضافة بواسطة"),
            t("table.columns.status", "الحالة"),
            t("table.columns.responseTime", "توقيت الرد"),
          ]}
          data={guests.map((guest) => ({
            id: guest.guestId || guest._id,
            name: guest.name || "-",
            phone: guest.phone || "-",
            email: guest.email || "-",
            addedBy: guest.addedBy || "-",
            status: guest.status || "invited",
            responseTime: guest.respondAt,
          }))}
          actions={[
            {
              type: "dropdown",
              icon: <FiEdit2 size={16} />,
              text: t("table.actions.edit", "تعديل"),
              onClick: (row) => {
                const guest = guests.find(
                  (g) => (g.guestId || g._id) === row.id
                );
                if (guest) handleEditGuest(guest);
              },
            },
            {
              type: "dropdown",
              icon: <FiTrash2 size={16} />,
              text: t("table.actions.delete", "حذف"),
              onClick: (row) => {
                const guest = guests.find(
                  (g) => (g.guestId || g._id) === row.id
                );
                if (guest) handleDeleteGuest(guest);
              },
            },
          ]}
          moreOptions={[
            {
              text: t("messaging.sendInvitations", "إرسال الدعوات"),
              onClick: handleSendInvitation,
            },
            {
              text: t("singleEvent.header.sendReminder", "إرسال تذكير"),
              onClick: handleSendReminder,
            },
          ]}
          renderCell={(key, value, row) => {
            if (key === "status") {
              const statusConfig = {
                accepted: {
                  bg: "#EAF4EF",
                  color: "#2A8C5B",
                  text: t("table.status.accepted", "مؤكد"),
                },
                confirmed: {
                  bg: "#EAF4EF",
                  color: "#2A8C5B",
                  text: t("table.status.confirmed", "مؤكد"),
                },
                declined: {
                  bg: "#F9EBEA",
                  color: "#C0392B",
                  text: t("table.status.declined", "معتذر"),
                },
                invited: {
                  bg: "#FBF3E6",
                  color: "#D38200",
                  text: t("table.status.invited", "لم يرد"),
                },
                "no-response": {
                  bg: "#FBF3E6",
                  color: "#D38200",
                  text: t("table.status.noResponse", "لم يرد"),
                },
                maybe: {
                  bg: "#F8FAFC",
                  color: "#64748B",
                  text: t("table.status.maybe", "ربما"),
                },
                tentative: {
                  bg: "#F8FAFC",
                  color: "#64748B",
                  text: t("table.status.tentative", "ربما"),
                },
              };
              const config = statusConfig[value] || statusConfig.invited;
              return (
                <div
                  style={{
                    display: "inline-flex",
                    padding: "0.3rem 1.2rem",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: "9999px",
                    background: config.bg,
                  }}
                >
                  <span
                    style={{
                      color: config.color,
                      fontFamily: "Cairo",
                      fontSize: "1.2rem",
                    }}
                  >
                    {config.text}
                  </span>
                </div>
              );
            }
            if (key === "responseTime" && value) {
              return new Date(value).toLocaleDateString(
                isArabic ? "ar-SA" : "en-US",
                { year: "numeric", month: "long", day: "numeric" }
              );
            }
            return value;
          }}
          showSearch={true}
          showFilter={false}
          showExport={true}
          onExportClick={handleExportGuests}
        />
      </div>

      <PopupWrapper isOpen={showEditPopup} onClose={handleCloseEditPopup}>
        <AddGuestPopup
          onConfirm={handleUpdateGuest}
          onCancel={handleCloseEditPopup}
          eventId={eventId}
          editGuest={editingGuest}
        />
      </PopupWrapper>

      <PopupWrapper
        isOpen={showReminderPopup}
        onClose={handleCloseReminderPopup}
      >
        <ReminderPopup
          numberOfGuests={guests.length}
          onConfirm={handleConfirmReminder}
          onCancel={handleCloseReminderPopup}
        />
      </PopupWrapper>

      <PopupWrapper
        isOpen={showInvitationPopup}
        onClose={handleCloseInvitationPopup}
      >
        <SendInvitationPopup
          selectedCount={selectedGuests.length}
          onConfirm={handleConfirmSendInvitation}
          onCancel={handleCloseInvitationPopup}
          isLoading={isSendingInvitation}
        />
      </PopupWrapper>
    </>
  );
}
