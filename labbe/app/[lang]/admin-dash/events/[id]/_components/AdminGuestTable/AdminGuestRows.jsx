"use client";
import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";

const renderStatusBadge = (value, t) => {
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
};

export default function AdminGuestRows({
  guests,
  t,
  isArabic,
  onEditGuest,
  onDeleteGuest,
  onSendInvitation,
  onSendReminder,
  onExportGuests,
}) {
  return (
    <Table
      title={t("singleEvent.guestTable.title", "قائمة الضيوف")}
      headers={[
        t("table.columns.guestName", "اسم العميل"),
        t("table.columns.mobile", "رقم الجوال"),
        t("table.columns.addedBy", "إضافة بواسطة"),
        t("table.columns.status", "الحالة"),
        t("table.columns.responseTime", "توقيت الرد"),
      ]}
      data={guests.map((guest) => ({
        id: guest.id,
        name: guest.name || "-",
        phone: guest.phone || "-",
        addedBy: guest.addedBy?.username || guest.addedBy?.name || "-",
        status: guest.status || "invited",
        responseTime: guest.rsvp?.respondedAt,
      }))}
      actions={[
        {
          type: "dropdown",
          icon: <FiEdit2 size={16} />,
          text: t("table.actions.edit", "تعديل"),
          onClick: (row) => {
            const guest = guests.find((g) => g.id === row.id);
            if (guest) onEditGuest(guest);
          },
        },
        {
          type: "dropdown",
          icon: <FiTrash2 size={16} />,
          text: t("table.actions.delete", "حذف"),
          onClick: (row) => {
            const guest = guests.find((g) => g.id === row.id);
            if (guest) onDeleteGuest(guest);
          },
        },
      ]}
      moreOptions={[
        {
          text: t("messaging.sendInvitations", "إرسال الدعوات"),
          onClick: onSendInvitation,
        },
        {
          text: t("singleEvent.header.sendReminder", "إرسال تذكير"),
          onClick: onSendReminder,
        },
      ]}
      renderCell={(key, value) => {
        if (key === "status") return renderStatusBadge(value, t);
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
      onExportClick={onExportGuests}
    />
  );
}
