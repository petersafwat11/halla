"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import styles from "../singleEvent.module.css";
import useAdminGuestTableActions from "./useAdminGuestTableActions";
import AdminGuestTablePopups from "./AdminGuestTablePopups";

export default function AdminGuestTable({ data }) {
  const { t, i18n } = useTranslation("adminEvents");
  const isArabic = i18n.language === "ar";

  const guests = data.guests;

  const {
    eventId,
    showEditPopup,
    showReminderPopup,
    showInvitationPopup,
    editingGuest,
    isSendingInvitation,
    selectedGuests,
    handleExportGuests,
    handleEditGuest,
    handleDeleteGuest,
    handleUpdateGuest,
    handleCloseEditPopup,
    handleSendReminder,
    handleCloseReminderPopup,
    handleConfirmReminder,
    handleSendInvitation,
    handleConfirmSendInvitation,
    handleCloseInvitationPopup,
  } = useAdminGuestTableActions({ guests, t });

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

      <AdminGuestTablePopups
        eventId={eventId}
        guestsCount={guests.length}
        showEditPopup={showEditPopup}
        showReminderPopup={showReminderPopup}
        showInvitationPopup={showInvitationPopup}
        editingGuest={editingGuest}
        selectedGuestsCount={selectedGuests.length}
        isSendingInvitation={isSendingInvitation}
        onCloseEditPopup={handleCloseEditPopup}
        onUpdateGuest={handleUpdateGuest}
        onCloseReminderPopup={handleCloseReminderPopup}
        onConfirmReminder={handleConfirmReminder}
        onCloseInvitationPopup={handleCloseInvitationPopup}
        onConfirmSendInvitation={handleConfirmSendInvitation}
      />
    </>
  );
}
