"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthMutation } from "@/hooks/reactQueryHooks/useAuthMutation";
import useAuthStore from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
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
 * `localization/locales/{ar,en}/setupPassword.json`).
 */

const buildSchema = (t) =>
  z
    .object({
      password: z.string().min(8, t("errors.password_too_short")),
      passwordConfirm: z.string().min(1, t("errors.password_mismatch")),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("errors.password_mismatch"),
      path: ["passwordConfirm"],
    });

export default function SetupPassword({ token }) {
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang === "en" ? "en" : "ar";
  const isRtl = lang !== "en";
  const { t } = useTranslation("setupPassword");

  const validate = useAuthMutation("validateSetupToken");
  const setupPasswordMutation = useAuthMutation("setupPassword");

  const [tokenStatus, setTokenStatus] = useState("checking"); // 'checking' | 'valid' | 'invalid'
  const [tokenInfo, setTokenInfo] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { password: "", passwordConfirm: "" },
  });

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

  const onSubmit = async ({ password, passwordConfirm }) => {
    try {
      await setupPasswordMutation.mutateAsync({
        token,
        password,
        passwordConfirm,
      });
      // The mutation's onSuccess pulled the user out of the response
      // shape (`{ token, refreshToken, data: { user, subscription } }`)
      // and committed it to the auth store. Read the canonical user
      // from the store rather than re-deriving from the raw response —
      // shape drift only shows up in one place that way.
      const user = useAuthStore.getState().user;
      toastUtils.success(t("success.password_set"));
      // Route into the appropriate dashboard. The post-approval whitelabel
      // admin currently shares the /admin-dash space (ROLE_PAGE_ACCESS in
      // serverAuth.js); 4b doesn't fan out a /whitelabel root. Hosts go
      // to /host. Anything else (admin / super_admin / etc) lands on
      // /admin-dash too.
      const target = user?.role === "host" ? "host" : "admin-dash";
      router.replace(`/${lang}/${target}`);
    } catch (err) {
      handleError(err, t, { showToast: false });
      // Surface the backend message in the form so the user sees it
      // inline rather than only in a toast (the form already shows the
      // error div below the inputs).
    }
  };

  if (tokenStatus === "checking") {
    return (
      <div className={styles.wrapper} dir={isRtl ? "rtl" : "ltr"}>
        <SimpleLoading message={t("validating_token")} />
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className={styles.wrapper} dir={isRtl ? "rtl" : "ltr"}>
        <div className={styles.card}>
          <h1 className={styles.title}>{t("invalid_title")}</h1>
          <p className={styles.body}>{t("invalid_message")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} dir={isRtl ? "rtl" : "ltr"}>
      <form className={styles.card} onSubmit={handleSubmit(onSubmit)}>
        <h1 className={styles.title}>{t("title")}</h1>
        {tokenInfo?.email ? (
          <p className={styles.subtitle}>
            {t("subtitle")}
            <strong>{tokenInfo.email}</strong>
          </p>
        ) : null}

        <label className={styles.label}>
          {t("password_label")}
          <input
            type="password"
            className={styles.input}
            {...register("password")}
            minLength={8}
            autoComplete="new-password"
            data-testid="setup-password-input"
          />
          {errors.password ? (
            <span className={styles.fieldError} role="alert">
              {errors.password.message}
            </span>
          ) : null}
        </label>

        <label className={styles.label}>
          {t("password_confirm_label")}
          <input
            type="password"
            className={styles.input}
            {...register("passwordConfirm")}
            minLength={8}
            autoComplete="new-password"
            data-testid="setup-password-confirm-input"
          />
          {errors.passwordConfirm ? (
            <span className={styles.fieldError} role="alert">
              {errors.passwordConfirm.message}
            </span>
          ) : null}
        </label>

        <button
          type="submit"
          className={styles.submit}
          disabled={setupPasswordMutation.isPending}
          data-testid="setup-password-submit"
        >
          {setupPasswordMutation.isPending ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
