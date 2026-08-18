"use client";

import React, { useState } from "react";
import { Ban, Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { apiRequest } from "@/services/http";

/**
 * Report-vendor action for the public marketplace profile (§6). Mirrors
 * ShareButton (client sibling) so the server VendorProfile can stay static.
 * Posts to the authenticated /moderation/report; an unauthenticated viewer is
 * prompted to sign in.
 */
const REASONS = [
  { key: "spam", ar: "محتوى مزعج", en: "Spam" },
  { key: "impersonation", ar: "انتحال هوية", en: "Impersonation" },
  { key: "illegal", ar: "محتوى مخالف", en: "Prohibited content" },
  { key: "other", ar: "أخرى", en: "Other" },
];

export default function ReportVendorButton({ vendorId, label, lang = "ar" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ar = lang === "ar";

  const submit = async (reason) => {
    setBusy(true);
    try {
      await apiRequest({
        method: "POST",
        path: "/moderation/report",
        data: {
          targetType: "vendor_profile",
          targetId: vendorId,
          reportedActorType: "user",
          reportedActorId: vendorId,
          reason,
        },
      });
      toast.success(ar ? "تم الإبلاغ. شكرًا لك." : "Reported. Thank you.");
      setOpen(false);
    } catch (e) {
      if (e?.response?.status === 401) {
        toast.info(ar ? "سجّل الدخول للإبلاغ." : "Please sign in to report.");
      } else {
        toast.error(ar ? "حدث خطأ ما." : "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  const blockVendor = async () => {
    setBusy(true);
    try {
      await apiRequest({
        method: "POST",
        path: "/moderation/block",
        data: { blockedActorType: "user", blockedActorId: vendorId },
      });
      toast.success(ar ? "تم حظر مقدم الخدمة وإخفاؤه." : "Vendor blocked and hidden.");
      router.replace(`/${lang}/market-place`);
      router.refresh();
    } catch (e) {
      if (e?.response?.status === 401) {
        toast.info(ar ? "سجّل الدخول للحظر." : "Please sign in to block.");
      } else {
        toast.error(ar ? "حدث خطأ ما." : "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label || (ar ? "إبلاغ" : "Report")}
        disabled={busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "#777",
          cursor: "pointer",
          font: "inherit",
        }}
      >
        <Flag size={16} />
        {label || (ar ? "إبلاغ" : "Report")}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "100%",
            marginTop: 4,
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 30,
            minWidth: 180,
            padding: 6,
          }}
        >
          {REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              disabled={busy}
              onClick={() => submit(r.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: ar ? "right" : "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                fontSize: 13,
                color: "#333",
                borderRadius: 6,
              }}
            >
              {ar ? r.ar : r.en}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={blockVendor}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: ar ? "flex-end" : "flex-start",
              gap: 6,
              textAlign: ar ? "right" : "left",
              background: "none",
              border: "none",
              borderTop: "1px solid #eee",
              cursor: "pointer",
              padding: "9px 8px 8px",
              fontSize: 13,
              color: "#b42318",
            }}
          >
            <Ban size={15} />
            {ar ? "حظر مقدم الخدمة" : "Block vendor"}
          </button>
        </div>
      )}
    </div>
  );
}
