"use client";

import React, { useState } from "react";
import { Ban, Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { apiRequest } from "@/services/http";
import ar from "@/localization/locales/ar/marketplace.json";
import en from "@/localization/locales/en/marketplace.json";

/**
 * Report-vendor action for the public marketplace profile (§6). Mirrors
 * ShareButton (client sibling) so the server VendorProfile can stay static.
 * Posts to the authenticated /moderation/report; an unauthenticated viewer is
 * prompted to sign in.
 */
export default function ReportVendorButton({ vendorId, label, lang = "ar" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isAr = lang === "ar";
  const copy = isAr ? ar : en;

  const reasons = [
    { key: "spam", label: copy.vendor?.rSpam || (isAr ? "محتوى مزعج" : "Spam") },
    { key: "impersonation", label: copy.vendor?.rImpersonation || (isAr ? "انتحال هوية" : "Impersonation") },
    { key: "illegal", label: copy.vendor?.rIllegal || (isAr ? "محتوى مخالف" : "Prohibited content") },
    { key: "other", label: copy.vendor?.rOther || (isAr ? "أخرى" : "Other") },
  ];

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
      toast.success(copy.vendor?.reportedMsg || (isAr ? "تم الإبلاغ. شكرًا لك." : "Reported. Thank you."));
      setOpen(false);
    } catch (e) {
      if (e?.response?.status === 401) {
        toast.info(copy.vendor?.signInToReport || (isAr ? "سجّل الدخول للإبلاغ." : "Please sign in to report."));
      } else {
        toast.error(copy.errors?.loadFailed || (isAr ? "حدث خطأ ما." : "Something went wrong."));
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
      toast.success(copy.vendor?.blockedMsg || (isAr ? "تم حظر مقدم الخدمة وإخفاؤه." : "Vendor blocked and hidden."));
      router.replace(`/${lang}/market-place`);
      router.refresh();
    } catch (e) {
      if (e?.response?.status === 401) {
        toast.info(copy.vendor?.signInToBlock || (isAr ? "سجّل الدخول للحظر." : "Please sign in to block."));
      } else {
        toast.error(copy.errors?.loadFailed || (isAr ? "حدث خطأ ما." : "Something went wrong."));
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
        aria-label={label || copy.vendor?.report || (isAr ? "إبلاغ" : "Report")}
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
        {label || copy.vendor?.report || (isAr ? "إبلاغ" : "Report")}
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
          {reasons.map((r) => (
            <button
              key={r.key}
              type="button"
              disabled={busy}
              onClick={() => submit(r.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: isAr ? "right" : "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                fontSize: 13,
                color: "#333",
                borderRadius: 6,
              }}
            >
              {r.label}
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
              justifyContent: isAr ? "flex-end" : "flex-start",
              gap: 6,
              textAlign: isAr ? "right" : "left",
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
            {copy.vendor?.blockVendor || (isAr ? "حظر مقدم الخدمة" : "Block vendor")}
          </button>
        </div>
      )}
    </div>
  );
}
