"use client";
import React from "react";
import Table from "@/ui/commen/new-table/Table";
import {
  renderSentViaBadge,
  renderStatusBadge,
} from "./guestCellRenderers";

export default function GuestRows({
  guests,
  t,
  formatDate,
  onEditGuest,
  onDeleteGuest,
  onSendInvitation,
  onSendReminder,
  onExportGuests,
}) {
  const guestsList = guests || [];

  return (
    <Table
      title={t("singleEvent.guestTable.title", "قائمة الضيوف")}
      headers={[
        t("table.columns.guestName", "اسم الضيف"),
        t("table.columns.mobile", "رقم الجوال"),
        t("table.columns.email", "البريد الإلكتروني"),
        t("table.columns.addedBy", "أضافه"),
        t("table.columns.status", "الحالة"),
        t("table.columns.sentVia", "أُرسل عبر"),
        t("table.columns.responseTime", "وقت الرد"),
      ]}
      data={guestsList.map((guest) => ({
        id: guest.id,
        name: guest.name || "-",
        phone: guest.phone || "-",
        email: guest.email || "-",
        addedBy: guest.addedBy?.username || guest.addedBy?.name || "-",
        status: guest.status || "invited",
        sentVia:
          guest.invitation?.effectiveChannel || guest.invitation?.method || null,
        smsFallback: guest.invitation?.smsFallback || false,
        responseTime: guest.rsvp?.respondedAt,
      }))}
      actions={[
        {
          type: "dropdown",
          icon: "/svg/events/edit.svg",
          text: t("table.actions.edit", "تعديل"),
          onClick: (row) => {
            const guest = guestsList.find((g) => g.id === row.id);
            if (guest) onEditGuest(guest);
          },
        },
        {
          type: "dropdown",
          icon: "/svg/events/delete.svg",
          text: t("table.actions.delete", "حذف"),
          onClick: (row) => {
            const guest = guestsList.find((g) => g.id === row.id);
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
      renderCell={(key, value, row) => {
        if (key === "sentVia") return renderSentViaBadge(value, row, t);
        if (key === "status") return renderStatusBadge(value, t);
        if (key === "responseTime" && value) return formatDate(value);
        return value;
      }}
      showSearch={true}
      showFilter={false}
      showExport={true}
      onExportClick={onExportGuests}
    />
  );
}
