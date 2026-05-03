"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import PopupLayout from "@/ui/commen/popup/PopupLayout";

/**
 * Phase 4b W1-WL-EMAIL — Approve dialog (D5).
 *
 * Replaces the bare `window.confirm()` flow when an admin clicks Approve
 * on a `pending` whitelabel. Renders inside the existing PopupLayout
 * shell so the visual style matches the rest of the admin dashboard.
 *
 * Props
 *   isOpen         — controls visibility
 *   onClose        — close without action
 *   onConfirm({ dispatchSetupEmail }) — fires the status update; the
 *                    flag is forwarded to the backend so the email is
 *                    dispatched atomically with the status flip
 *   isPending      — true while the parent mutation is in flight
 *   whitelabel     — the WL document (so we can show their name + email)
 */
export default function ApproveWhitelabelDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending = false,
  whitelabel = null,
}) {
  const [dispatchSetupEmail, setDispatchSetupEmail] = useState(true);
  let t;
  try {
    ({ t } = useTranslation("adminWhitelabels"));
  } catch (_) {
    t = (_k, fb) => fb;
  }

  const displayName =
    whitelabel?.profile?.whitelabelData?.arabicName ||
    whitelabel?.username ||
    whitelabel?.email ||
    "—";

  const handleConfirm = () => {
    onConfirm({ dispatchSetupEmail });
  };

  return (
    <PopupLayout isOpen={isOpen} onClose={onClose}>
      <div
        style={{
          minWidth: 360,
          maxWidth: 480,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        data-testid="approve-whitelabel-dialog"
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {t("approveWhitelabelDialog.title", "تأكيد الموافقة")}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          {t(
            "approveWhitelabelDialog.body",
            "أنت على وشك الموافقة على هذه المنصة. سيتم تنشيط الحساب فوراً."
          )}
        </p>
        <div
          style={{
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 13,
            color: "#1f2937",
          }}
        >
          <div>
            <strong>{t("approveWhitelabelDialog.platform", "المنصة")}:</strong>{" "}
            {displayName}
          </div>
          {whitelabel?.email ? (
            <div>
              <strong>{t("approveWhitelabelDialog.email", "البريد")}:</strong>{" "}
              {whitelabel.email}
            </div>
          ) : null}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            color: "#1f2937",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={dispatchSetupEmail}
            onChange={(e) => setDispatchSetupEmail(e.target.checked)}
            disabled={isPending}
            data-testid="approve-whitelabel-dispatch-email"
          />
          <span>
            {t(
              "approveWhitelabelDialog.dispatchEmail",
              "إرسال رابط إعداد كلمة المرور بالبريد"
            )}
          </span>
        </label>
        <p
          style={{
            margin: "-8px 0 0 0",
            fontSize: 12,
            color: "#6b7280",
            lineHeight: 1.5,
          }}
        >
          {t(
            "approveWhitelabelDialog.dispatchEmailHint",
            "عند التفعيل، سيتم إنشاء رمز جديد وإرسال البريد فوراً. الرمز السابق (إن وجد) سيصبح غير صالح."
          )}
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {t("approveWhitelabelDialog.cancel", "إلغاء")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="approve-whitelabel-confirm"
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#2a8c5b",
              color: "#ffffff",
              cursor: isPending ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending
              ? t("approveWhitelabelDialog.submitting", "جارٍ الموافقة...")
              : dispatchSetupEmail
                ? t("approveWhitelabelDialog.confirm", "موافقة وإرسال")
                : t("approveWhitelabelDialog.confirmNoEmail", "موافقة")}
          </button>
        </div>
      </div>
    </PopupLayout>
  );
}
