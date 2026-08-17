"use client";
import React from "react";
import { getStatusVisual } from "@/utils/statusColors";

export function renderSentViaBadge(value, row, t) {
  if (!value) return <span style={{ color: "#9CA3AF" }}>—</span>;
  const isWhatsApp = value === "whatsapp";
  const isFallback = row.smsFallback;
  const badge = isWhatsApp
    ? {
        bg: "#D1F2EB",
        color: "#1A7A5E",
        icon: "📱",
        label: t("table.channel.whatsapp", "واتساب"),
      }
    : {
        bg: "#FFF3CD",
        color: "#856404",
        icon: "💬",
        label: isFallback
          ? t("table.channel.smsFallback", "SMS (بديل)")
          : t("table.channel.sms", "SMS"),
      };
  return (
    <div
      style={{
        display: "inline-flex",
        gap: "4px",
        alignItems: "center",
        padding: "0.25rem 0.9rem",
        borderRadius: "9999px",
        background: badge.bg,
      }}
    >
      <span style={{ fontSize: "1rem" }}>{badge.icon}</span>
      <span style={{ color: badge.color, fontFamily: "Cairo", fontSize: "1.1rem" }}>
        {badge.label}
      </span>
    </div>
  );
}

// Compact pill renderer reused by the Auto/Extra reminder columns.
// Color palette mirrors the existing channel / status badges so the
// row stays visually consistent.
function reminderPill({ tone, label, title }) {
  const palette =
    tone === "success"
      ? { bg: "#EAF4EF", color: "#2A8C5B" }
      : tone === "info"
      ? { bg: "#E8F4FD", color: "#1F6FB6" }
      : { bg: "transparent", color: "#9CA3AF" };
  return (
    <div
      title={title || undefined}
      style={{
        display: "inline-flex",
        padding: "0.25rem 0.9rem",
        borderRadius: "9999px",
        background: palette.bg,
      }}
    >
      <span
        style={{
          color: palette.color,
          fontFamily: "Cairo",
          fontSize: "1.1rem",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function renderAutoReminderBadge(row, t, formatDateTime) {
  const inv = row?.invitation || {};
  if (!inv.autoReminderSent) {
    return <span style={{ color: "#9CA3AF" }}>—</span>;
  }
  const when = inv.autoReminderSentAt
    ? (formatDateTime?.(inv.autoReminderSentAt) || new Date(inv.autoReminderSentAt).toLocaleString())
    : "";
  return reminderPill({
    tone: "success",
    label: t("table.cell.sent", "تم الإرسال"),
    title: when,
  });
}

export function renderStatusBadge(value, t) {
  const statusText = {
    confirmed: t("table.status.confirmed", "مؤكد"),
    checked_in: t("table.status.checkedIn", "حضر"),
    declined: t("table.status.declined", "معتذر"),
    invited: t("table.status.invited", "مدعو"),
  };
  // Unknown status falls back to the "invited" label/colors, matching the
  // previous behavior.
  const resolvedStatus = statusText[value] ? value : "invited";
  const { fg, bg } = getStatusVisual(resolvedStatus);
  const text = statusText[resolvedStatus];
  return (
    <div
      style={{
        display: "inline-flex",
        padding: "0.3rem 1.2rem",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: "9999px",
        background: bg,
      }}
    >
      <span
        style={{
          color: fg,
          fontFamily: "Cairo",
          fontSize: "1.2rem",
        }}
      >
        {text}
      </span>
    </div>
  );
}
