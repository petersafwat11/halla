"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Image from "next/image";

import ConfirmBtn from "@/ui/commen/confirmButton/ConfirmBtn";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import { FormProvider, useForm } from "react-hook-form";

import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";
import {
  parseError,
  getAuthErrorMessage,
} from "@/services/errorHandlingService";
import useLanguageChange from "@/hooks/UseLanguageChange";

import styles from "./verifyEmail.module.css";

const STATE = {
  VERIFYING: "verifying",
  SUCCESS: "success",
  EXPIRED: "expired",
  RESENT: "resent",
};

const VerifyEmail = () => {
  const { t } = useTranslation("common");
  const { currentLocale } = useLanguageChange();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState(STATE.VERIFYING);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendBusy, setResendBusy] = useState(false);

  const methods = useForm({ defaultValues: { email: "" } });

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setErrorMsg(t("authErrors.VERIFICATION_TOKEN_MISSING"));
      setState(STATE.EXPIRED);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiRequest({
          method: "GET",
          path: API_PATHS.auth.verifyEmailLink,
          params: { token },
        });
        if (!cancelled) setState(STATE.SUCCESS);
      } catch (error) {
        if (cancelled) return;
        const parsed = parseError(error);
        const resolved = getAuthErrorMessage(parsed, t);
        setErrorMsg(resolved?.message || t("authErrors.UNKNOWN"));
        setState(STATE.EXPIRED);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, t]);

  const onResend = methods.handleSubmit(async ({ email }) => {
    if (!email) return;
    setResendBusy(true);
    try {
      await apiRequest({
        method: "POST",
        path: API_PATHS.auth.resendEmailVerification,
        data: { email },
      });
      setState(STATE.RESENT);
    } catch (error) {
      const parsed = parseError(error);
      const resolved = getAuthErrorMessage(parsed, t);
      setErrorMsg(resolved?.message || t("authErrors.UNKNOWN"));
    } finally {
      setResendBusy(false);
    }
  });

  const goHome = () => router.push(`/${currentLocale}/host`);

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        {state === STATE.VERIFYING && (
          <div className={styles.message_container}>
            <h2 className={styles.title}>{t("verifyEmail.verifyingTitle")}</h2>
            <p className={styles.description}>{t("verifyEmail.verifyingSubtitle")}</p>
          </div>
        )}

        {state === STATE.SUCCESS && (
          <div className={styles.message_container}>
            <div className={styles.image_container}>
              <Image
                className={styles.icon}
                src={"/svg/auth/true.svg"}
                alt="verified"
                width={115}
                height={116}
              />
            </div>
            <h2 className={styles.title}>{t("verifyEmail.successTitle")}</h2>
            <p className={styles.description}>{t("verifyEmail.successSubtitle")}</p>
            <ConfirmBtn
              text={t("verifyEmail.goToHome")}
              active={true}
              clickHandler={goHome}
            />
          </div>
        )}

        {state === STATE.EXPIRED && (
          <div className={styles.message_container}>
            <div className={styles.image_container}>
              <Image
                className={styles.icon}
                src={"/svg/auth/forget-password.svg"}
                alt="expired"
                width={80}
                height={105}
              />
            </div>
            <h2 className={styles.title}>{t("verifyEmail.expiredTitle")}</h2>
            <p className={styles.description}>
              {errorMsg || t("verifyEmail.expiredSubtitle")}
            </p>

            <FormProvider {...methods}>
              <form onSubmit={onResend} className={styles.resend_form}>
                <InputGroup
                  label={t("verifyEmail.emailLabel")}
                  type="email"
                  placeholder={t("verifyEmail.emailPlaceholder")}
                  name="email"
                  iconPath="auth/email.svg"
                />
                <ConfirmBtn
                  text={t("verifyEmail.resendButton")}
                  active={!resendBusy}
                  clickHandler={onResend}
                  disabled={resendBusy}
                />
              </form>
            </FormProvider>
          </div>
        )}

        {state === STATE.RESENT && (
          <div className={styles.message_container}>
            <div className={styles.image_container}>
              <Image
                className={styles.icon}
                src={"/svg/auth/true.svg"}
                alt="sent"
                width={115}
                height={116}
              />
            </div>
            <h2 className={styles.title}>{t("verifyEmail.resendSentTitle")}</h2>
            <p className={styles.description}>{t("verifyEmail.resendSentSubtitle")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
