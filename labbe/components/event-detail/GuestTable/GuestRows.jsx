"use client";
import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import {
  renderSentViaBadge,
  renderStatusBadge,
  renderAutoReminderBadge,
  renderExtraReminderBadge,
} from "./guestCellRenderers";

export default function GuestRows({
  guests,
  t,
  formatDate,
  formatDateTime,
  onEditGuest,
  onDeleteGuest,
  onSendInvitation,
  onSendReminder,
  onExportGuests,
}) {
  const guestsList = guests || [];

  // Column keys must match `headers` 1:1 in the same order. The Table
  // component falls back to `Object.keys(row)` when `headerKeys` isn't
  // passed, which would render every property as a column — including
  // side-channel fields like `smsFallback` that the renderer reads from
  // `row` but should never be its own cell. Pass keys explicitly.
  const columnKeys = [
    "name",
    "phone",
    "addedBy",
    "status",
    "sentVia",
    "autoReminder",
    "extraReminder",
    "responseTime",
  ];

  return (
    <Table
      title={t("singleEvent.guestTable.title", "قائمة الضيوف")}
      headers={[
        t("table.columns.guestName", "اسم الضيف"),
        t("table.columns.mobile", "رقم الجوال"),
        t("table.columns.addedBy", "أضافه"),
        t("table.columns.status", "الحالة"),
        t("table.columns.sentVia", "أُرسل عبر"),
        t("table.columns.autoReminder", "تذكير تلقائي"),
        t("table.columns.extraReminder", "تذكير إضافي"),
        t("table.columns.responseTime", "وقت الرد"),
      ]}
      headerKeys={columnKeys}
      data={guestsList.map((guest) => ({
        id: guest.id,
        name: guest.name || "-",
        phone: guest.phone || "-",
        addedBy: guest.addedBy?.username || guest.addedBy?.name || "-",
        status: guest.status || "invited",
        sentVia:
          guest.invitation?.effectiveChannel || guest.invitation?.method || null,
        smsFallback: guest.invitation?.smsFallback || false,
        // Pass the raw invitation sub-object through so the renderers
        // (which are pure cell-level) can read auto/extra fields without
        // us having to flatten every flag onto the row shape.
        invitation: guest.invitation || {},
        autoReminder: guest.invitation?.autoReminderSent || false,
        extraReminder:
          guest.invitation?.extraReminderSent ||
          guest.invitation?.extraReminderScheduled ||
          false,
        responseTime: guest.rsvp?.respondedAt,
      }))}
      actions={[
        {
          type: "dropdown",
          icon: <FiEdit2 size={16} />,
          text: t("table.actions.edit", "تعديل"),
          onClick: (row) => {
            const guest = guestsList.find((g) => g.id === row.id);
            if (guest) onEditGuest(guest);
          },
        },
        {
          type: "dropdown",
          icon: <FiTrash2 size={16} />,
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
        if (key === "autoReminder") return renderAutoReminderBadge(row, t, formatDateTime || formatDate);
        if (key === "extraReminder") return renderExtraReminderBadge(row, t, formatDateTime || formatDate);
        if (key === "responseTime" && value) {
          // Show full date+time so the host can see exactly when the
          // guest replied — date alone is ambiguous after 24h.
          return (formatDateTime || formatDate)(value);
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
