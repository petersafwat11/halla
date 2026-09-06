"use client";
import React from "react";
import { FiEdit2, FiTrash2, FiRefreshCw, FiSlash } from "react-icons/fi";
import Table from "@/ui/commen/new-table/Table";
import {
  renderSentViaBadge,
  renderStatusBadge,
  renderAutoReminderBadge,
} from "./guestCellRenderers";

export default function GuestRows({
  guests,
  searchValue,
  onSearchChange,
  pagination,
  emptyMessage,
  onSelectionChange,
  t,
  formatDate,
  formatDateTime,
  statusFilter,
  onStatusFilterChange,
  onEditGuest,
  onDeleteGuest,
  onRotateQr,
  onRevokeAccess,
  onExportGuests,
}) {
  const guestsList = guests || [];

  const filterOptions = onStatusFilterChange && [
    { label: t("singleEvent.stats.all", "الكل"), value: null },
    { label: t("singleEvent.stats.confirmed"), value: "confirmed" },
    { label: t("singleEvent.stats.declined"), value: "declined" },
    { label: t("singleEvent.stats.noResponse"), value: "noResponse" },
    { label: t("singleEvent.stats.checkedIn"), value: "checkedIn" },
    { label: t("people.failed"), value: "failedDelivery" },
  ].map((opt) => ({
    ...opt,
    onClick: () => onStatusFilterChange(opt.value),
  }));

  const activeDropdownValue =
    statusFilter && statusFilter !== "totalGuests" ? statusFilter : null;

  const columnKeys = [
    "name",
    "phone",
    "addedBy",
    "status",
    "sentVia",
    "autoReminder",
    "responseTime",
  ];

  return (
    <Table
      mode="server"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      pagination={pagination}
      emptyMessage={emptyMessage}
      showCheckboxes={true}
      onSelectionChange={onSelectionChange}
      title={t("singleEvent.guestTable.title", "قائمة الضيوف")}
      headers={[
        t("table.columns.guestName", "اسم الضيف"),
        t("table.columns.mobile", "رقم الجوال"),
        t("table.columns.addedBy", "أضافه"),
        t("table.columns.status", "الحالة"),
        t("table.columns.sentVia", "أُرسل عبر"),
        t("table.columns.autoReminder", "تذكير تلقائي"),
        t("table.columns.responseTime", "وقت الرد"),
      ]}
      headerKeys={columnKeys}
      data={guestsList.map((guest) => ({
        id: guest.id,
        name: guest.name || "-",
        phone: guest.phone || "-",
        addedBy: guest.addedBy?.name || "-",
        status: guest.status || "invited",
        sentVia:
          guest.invitation?.effectiveChannel || guest.invitation?.method || null,
        smsFallback: guest.invitation?.smsFallback || false,
        invitation: guest.invitation || {},
        autoReminder: guest.invitation?.autoReminderSent || false,
        responseTime: guest.rsvp?.respondedAt,
      }))}
      actions={[
        ...(onEditGuest ? [{
          type: "dropdown",
          icon: <FiEdit2 size={16} />,
          text: t("table.actions.edit", "تعديل"),
          onClick: (row) => {
            const guest = guestsList.find((g) => g.id === row.id);
            if (guest) onEditGuest(guest);
          },
        }] : []),
        ...(onDeleteGuest ? [{
          type: "dropdown",
          icon: <FiTrash2 size={16} />,
          text: t("table.actions.delete", "حذف"),
          onClick: (row) => {
            const guest = guestsList.find((g) => g.id === row.id);
            if (guest) onDeleteGuest(guest);
          },
        }] : []),
        ...(onRotateQr
          ? [
              {
                type: "dropdown",
                icon: <FiRefreshCw size={16} />,
                text: t("table.actions.rotateQr", "تحديث رمز الدخول"),
                onClick: (row) => {
                  const guest = guestsList.find((g) => g.id === row.id);
                  if (guest) onRotateQr(guest);
                },
              },
            ]
          : []),
        ...(onRevokeAccess
          ? [
              {
                type: "dropdown",
                icon: <FiSlash size={16} />,
                text: t("table.actions.revokeAccess", "إلغاء الوصول"),
                onClick: (row) => {
                  const guest = guestsList.find((g) => g.id === row.id);
                  if (guest) onRevokeAccess(guest);
                },
              },
            ]
          : []),
      ]}
      renderCell={(key, value, row) => {
        if (key === "sentVia") return renderSentViaBadge(value, row, t);
        if (key === "status") return renderStatusBadge(value, t);
        if (key === "autoReminder") return renderAutoReminderBadge(row, t, formatDateTime || formatDate);
        if (key === "responseTime" && value) {
          return (formatDateTime || formatDate)(value);
        }
        return value;
      }}
      showSearch={true}
      showFilter={!!onStatusFilterChange}
      filterOptions={filterOptions}
      activeFilter={activeDropdownValue}
      showExport={true}
      onExportClick={onExportGuests}
    />
  );
}
