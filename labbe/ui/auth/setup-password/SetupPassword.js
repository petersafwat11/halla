"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthMutation } from "@/hooks/reactQueryHooks/useAuthMutation";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./SetupPassword.module.css";

/**
 * Phase 4b W1-WL-EMAIL — Setup Password client component.
 *
 * Renders the password-setup form a whitelabel admin lands on after
 * clicking the link in the approval email. Flow:
 *
 *   1. On mount: GET /auth/validate-setup-token/:token. If invalid or
 *      expired, render an error state with a "request new link" CTA
 *      pointing back at support.
 *   2. On submit: POST /auth/setup-password { token, password,
 *      passwordConfirm }. The backend response sets the HttpOnly access
 *      + refresh cookies AND returns the user; we then route the WL
 *      admin into their dashboard.
 *
 * Both mutations come from the centralized `useAuthMutation` hook so
 * the existing apiClient refresh wrapper applies; we never raw-fetch.
 *
 * Bilingual via the `setupPassword` namespace (lands in
 * `localization/locales/{ar,en}/setupPassword.json` — both already
 * exist for the mobile setup-password screen).
 */
export default function SetupPassword({ token }) {
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang === "en" ? "en" : "ar";
  const isRtl = lang !== "en";
  let t;
  try {
    ({ t } = useTranslation("setupPassword"));
  } catch (_) {
    t = (_k, fb) => fb;
  }

  const validate = useAuthMutation("validateSetupToken");
  const setupPassword = useAuthMutation("setupPassword");

  const [tokenStatus, setTokenStatus] = useState("checking"); // 'checking' | 'valid' | 'invalid'
  const [tokenInfo, setTokenInfo] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setTokenStatus("invalid");
      return undefined;
    }
    (async () => {
      try {
        const resp = await validate.mutateAsync(token);
        if (cancelled) return;
        const data = resp?.data?.data || resp?.data || resp;
        if (data?.valid) {
          setTokenInfo(data.user || null);
          setTokenStatus("valid");
        } else {
          setTokenStatus("invalid");
        }
      } catch (_e) {
        if (!cancelled) setTokenStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!password || password.length < 8) {
      setSubmitError(t("errors.password_too_short", isRtl
        ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
        : "Password must be at least 8 characters"));
      return;
    }
    if (password !== passwordConfirm) {
      setSubmitError(t("errors.password_mismatch", isRtl
        ? "كلمتا المرور غير متطابقتين"
        : "Passwords do not match"));
      return;
    }
    try {
      const resp = await setupPassword.mutateAsync({
        token,
        password,
        passwordConfirm,
      });
      const user = resp?.data?.data?.user || resp?.data?.user || resp?.user;
      toast.success(
        t("success.password_set", isRtl
          ? "تم إعداد كلمة المرور بنجاح"
          : "Password set successfully")
      );
      // Route into the appropriate dashboard. The post-approval whitelabel
      // admin currently shares the /admin-dash space (ROLE_PAGE_ACCESS in
      // serverAuth.js); 4b doesn't fan out a /whitelabel root.
      const target = user?.role === "host" ? "host" : "admin-dash";
      router.replace(`/${lang}/${target}`);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t("errors.generic", isRtl ? "حدث خطأ ما" : "Something went wrong");
      setSubmitError(msg);
    }
  };

  if (tokenStatus === "checking") {
    return (
      <div className={styles.wrapper} dir={isRtl ? "rtl" : "ltr"}>
        <SimpleLoading
          message={t("validating_token", isRtl ? "جارٍ التحقق..." : "Validating link...")}
        />
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className={styles.wrapper} dir={isRtl ? "rtl" : "ltr"}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            {t("invalid_title", isRtl ? "الرابط غير صالح" : "Invalid link")}
          </h1>
          <p className={styles.body}>
            {t(
              "invalid_message",
              isRtl
                ? "هذا الرابط منتهي الصلاحية أو غير صحيح. يرجى التواصل مع المسؤول لإرسال رابط جديد."
                : "This link has expired or is invalid. Please contact your administrator for a new link."
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} dir={isRtl ? "rtl" : "ltr"}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>
          {t("title", isRtl ? "إعداد كلمة المرور" : "Set up your password")}
        </h1>
        {tokenInfo?.email ? (
          <p className={styles.subtitle}>
            {t("subtitle", isRtl ? "للحساب: " : "For account: ")}
            <strong>{tokenInfo.email}</strong>
          </p>
        ) : null}

        <label className={styles.label}>
          {t("password_label", isRtl ? "كلمة المرور" : "Password")}
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
            data-testid="setup-password-input"
          />
        </label>

        <label className={styles.label}>
          {t("password_confirm_label", isRtl ? "تأكيد كلمة المرور" : "Confirm password")}
          <input
            type="password"
            className={styles.input}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
            data-testid="setup-password-confirm-input"
          />
        </label>

        {submitError ? (
          <div className={styles.error} role="alert">
            {submitError}
          </div>
        ) : null}

        <button
          type="submit"
          className={styles.submit}
          disabled={setupPassword.isPending || setupPassword.isLoading}
          data-testid="setup-password-submit"
        >
          {setupPassword.isPending || setupPassword.isLoading
            ? t("submitting", isRtl ? "جارٍ الحفظ..." : "Saving...")
            : t("submit", isRtl ? "حفظ كلمة المرور" : "Set password")}
        </button>
      </form>
    </div>
  );
}
