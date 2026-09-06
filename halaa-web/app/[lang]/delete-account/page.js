"use client";

/**
 * Public account-deletion page (SHIP §4.3 / Google Play data-deletion).
 *
 * Loads WITHOUT the app and lets a user actually SUBMIT a deletion request
 * (sign in → reauthenticate → delete), then shows the request ID + live status.
 * Uses the SAME backend deletion service as the native app. This is the
 * canonical URL to put in Google Play Data Safety:
 *   https://halaa.com.sa/en/delete-account  (and /ar/delete-account)
 */

import React, { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiRequest } from "@/services/http";
import { LEGAL_CONTACT } from "@halaa/shared/legal";

// Owner-approved support contact from the shared legal source.
const SUPPORT_EMAIL = LEGAL_CONTACT.supportEmail.value;

const COPY = {
  title: { en: "Delete your Halaa account", ar: "حذف حساب هلا" },
  intro: {
    en: "This permanently deletes your Halaa account and personal data — your profile, events, guests, photos, comments, support tickets, and notifications. This cannot be undone.",
    ar: "هذا يحذف نهائيًا حساب هلا وبياناتك الشخصية — ملفك الشخصي والمناسبات والضيوف والصور والتعليقات وتذاكر الدعم والإشعارات. لا يمكن التراجع عن هذا الإجراء.",
  },
  retention: {
    en: "For legal, tax, and anti-fraud reasons we retain pseudonymized financial and audit records (payments, subscriptions, audit logs) for the period required by law; these are not linked to restorable personal identifiers.",
    ar: "لأسباب قانونية وضريبية ومكافحة الاحتيال نحتفظ بسجلات مالية وتدقيقية مجهّلة الهوية (المدفوعات والاشتراكات وسجلات التدقيق) للمدة التي يفرضها القانون، وهي غير مرتبطة بمعرّفات شخصية قابلة للاستعادة.",
  },
  signInPrompt: {
    en: "Sign in to confirm it's your account, then delete it.",
    ar: "سجّل الدخول لتأكيد أنه حسابك، ثم احذفه.",
  },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  signIn: { en: "Sign in", ar: "تسجيل الدخول" },
  storeWarnTitle: {
    en: "Your store subscription stays active",
    ar: "اشتراكك في المتجر سيبقى فعّالاً",
  },
  storeWarnBody: {
    en: "Deleting your Halaa account does NOT cancel an App Store / Google Play subscription. Cancel it in the store to stop being billed.",
    ar: "حذف حسابك في هلا لا يلغي اشتراك App Store / Google Play. ألغِ الاشتراك من المتجر لإيقاف الخصم.",
  },
  confirmCheckbox: {
    en: "I understand this permanently deletes my account and data.",
    ar: "أفهم أن هذا يحذف حسابي وبياناتي نهائيًا.",
  },
  deleteBtn: { en: "Delete my account", ar: "حذف حسابي" },
  working: { en: "Processing…", ar: "جارٍ المعالجة…" },
  doneTitle: { en: "Deletion request received", ar: "تم استلام طلب الحذف" },
  requestId: { en: "Request ID", ar: "رقم الطلب" },
  statusLabel: { en: "Status", ar: "الحالة" },
  eta: {
    en: "Most data is removed immediately. Any remaining cleanup completes within 30 days.",
    ar: "تُحذف معظم البيانات فورًا، وتكتمل أي عمليات متبقية خلال 30 يومًا.",
  },
  support: {
    en: `Prefer email? Contact ${SUPPORT_EMAIL} from your account email and we'll process your request.`,
    ar: `تفضّل البريد؟ راسلنا على ${SUPPORT_EMAIL} من بريد حسابك وسنعالج طلبك.`,
  },
  signInFailed: {
    en: "Sign in failed. Check your email and password.",
    ar: "فشل تسجيل الدخول. تحقق من البريد وكلمة المرور.",
  },
  deleteFailed: {
    en: "Deletion failed. Please try again.",
    ar: "فشل الحذف. يرجى المحاولة مرة أخرى.",
  },
  statusValues: {
    processing: { en: "Processing", ar: "قيد المعالجة" },
    completed: { en: "Completed", ar: "اكتمل" },
    partial: { en: "Completing in background", ar: "يكتمل في الخلفية" },
    failed: { en: "Failed — please contact support", ar: "فشل — يرجى التواصل مع الدعم" },
  },
};

export default function DeleteAccountPage() {
  const params = useParams();
  const lang = params?.lang === "ar" ? "ar" : "en";
  const tx = useCallback((k) => COPY[k][lang], [lang]);
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [phase, setPhase] = useState("signin"); // signin | confirm | done
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      await apiRequest({
        method: "POST",
        path: "/auth/login",
        data: { email: email.trim().toLowerCase(), password },
      });
      // Load pre-deletion warning + retention (session cookie now set).
      let pre = null;
      try {
        const r = await apiRequest({ method: "GET", path: "/users/pre-deletion-info" });
        pre = r?.data || r;
      } catch {
        /* non-fatal */
      }
      setInfo(pre);
      setPhase("confirm");
    } catch (e) {
      setError(e?.response?.data?.message || tx("signInFailed"));
    } finally {
      setBusy(false);
    }
  }, [email, password, tx]);

  const doDelete = useCallback(async () => {
    if (!agree) return;
    setError("");
    setBusy(true);
    try {
      const r = await apiRequest({
        method: "DELETE",
        path: "/users/profile",
        data: { password },
      });
      setResult(r?.data || r);
      setPhase("done");
    } catch (e) {
      setError(e?.response?.data?.message || tx("deleteFailed"));
    } finally {
      setBusy(false);
    }
  }, [agree, password, tx]);

  // Poll status while processing.
  useEffect(() => {
    if (phase !== "done" || !result?.requestId) return;
    if (result.status && result.status !== "processing") return;
    const id = setInterval(async () => {
      try {
        const r = await apiRequest({
          method: "GET",
          path: `/users/deletion-status/${result.requestId}`,
        });
        const next = r?.data || r;
        setResult((prev) => ({ ...prev, ...next }));
        if (next?.status && next.status !== "processing") clearInterval(id);
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [phase, result?.requestId, result?.status]);

  const statusText =
    COPY.statusValues[result?.status]?.[lang] || result?.status || "";

  return (
    <main dir={dir} style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>{tx("title")}</h1>
        <p style={S.body}>{tx("intro")}</p>
        <p style={S.note}>{tx("retention")}</p>

        {error ? <p style={S.error}>{error}</p> : null}

        {phase === "signin" && (
          <>
            <p style={S.prompt}>{tx("signInPrompt")}</p>
            <label style={S.label}>{tx("email")}</label>
            <input
              style={S.input}
              type="email"
              placeholder="ahmed@gmail.com"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <label style={S.label}>{tx("password")}</label>
            <input
              style={S.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              style={S.primary}
              onClick={signIn}
              disabled={busy || !email || !password}
            >
              {busy ? tx("working") : tx("signIn")}
            </button>
          </>
        )}

        {phase === "confirm" && (
          <>
            {info?.hasActiveStoreSubscription ? (
              <div style={S.warn}>
                <strong style={S.warnTitle}>{tx("storeWarnTitle")}</strong>
                <p style={S.warnBody}>{tx("storeWarnBody")}</p>
              </div>
            ) : null}
            <label style={S.checkRow}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span style={S.checkText}>{tx("confirmCheckbox")}</span>
            </label>
            <button
              style={{ ...S.primary, ...S.danger, ...(!agree ? S.disabled : {}) }}
              onClick={doDelete}
              disabled={busy || !agree}
            >
              {busy ? tx("working") : tx("deleteBtn")}
            </button>
          </>
        )}

        {phase === "done" && (
          <div style={S.done}>
            <h2 style={S.doneTitle}>{tx("doneTitle")}</h2>
            <p style={S.body}>
              <strong>{tx("requestId")}:</strong> {result?.requestId}
            </p>
            <p style={S.body}>
              <strong>{tx("statusLabel")}:</strong> {statusText}
            </p>
            <p style={S.note}>{tx("eta")}</p>
          </div>
        )}

        <p style={S.support}>{tx("support")}</p>
      </div>
    </main>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9f4ef",
    padding: 24,
    // Inherit the app's Cairo font from the root layout (Arabic-first); no
    // system-font override.
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
  },
  title: { fontSize: 24, fontWeight: 700, color: "#222", margin: "0 0 12px" },
  body: { fontSize: 15, color: "#444", lineHeight: 1.7, margin: "0 0 12px" },
  note: { fontSize: 12.5, color: "#888", lineHeight: 1.6, margin: "0 0 16px" },
  prompt: { fontSize: 14, color: "#333", margin: "8px 0 12px", fontWeight: 600 },
  label: { display: "block", fontSize: 13, color: "#333", margin: "8px 0 4px", fontWeight: 600 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 16,
    marginBottom: 8,
    background: "#fafafa",
  },
  primary: {
    width: "100%",
    border: "none",
    borderRadius: 8,
    padding: "14px",
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    background: "#c28e5c",
    cursor: "pointer",
    marginTop: 12,
  },
  danger: { background: "#e74c3c" },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
  warn: {
    background: "#fff8ec",
    border: "1px solid #f0d9b5",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  warnTitle: { color: "#8a6d3b", fontSize: 14 },
  warnBody: { color: "#8a6d3b", fontSize: 13, margin: "6px 0 0", lineHeight: 1.6 },
  checkRow: { display: "flex", gap: 10, alignItems: "flex-start", margin: "8px 0" },
  checkText: { fontSize: 14, color: "#333", lineHeight: 1.5 },
  done: { textAlign: "center", padding: "8px 0" },
  doneTitle: { fontSize: 20, fontWeight: 700, color: "#2e7d32", margin: "0 0 12px" },
  error: {
    background: "#fdecec",
    color: "#c0392b",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13.5,
    margin: "0 0 12px",
  },
  support: { fontSize: 12.5, color: "#999", marginTop: 18, lineHeight: 1.6 },
};
