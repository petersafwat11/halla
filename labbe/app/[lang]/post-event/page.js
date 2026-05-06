"use client";
import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import PostEventContent from "./_components/PostEventContent/PostEventContent";
import {
  useValidatePostEventToken,
  usePostEventContent,
} from "@/hooks/reactQueryHooks/usePostEvent";
import { guestTokenUtils } from "@/services/postEvent";
import styles from "./page.module.css";

// H-16: render distinct messages per structured `qr_*` reason returned by
// GuestAccessToken.validateToken. Reasons:
//   - qr_rotated  → guest scanned a rotated link; ask them to use the newest message
//   - qr_revoked  → host revoked their access; ask them to contact host
//   - qr_expired  → access window ended; explain politely
//   - qr_invalid  → unknown token (typo / phishing) → generic invalid
const useReasonToMessage = (t) =>
  useMemo(
    () =>
      (reason, fallback) => {
        switch (reason) {
          case "qr_rotated":
            return t(
              "errors.qrRotated",
              "هذا الرابط لم يعد فعّالاً لأن المضيف أصدر رابطاً جديداً. يرجى استخدام أحدث رسالة وصلت إليك."
            );
          case "qr_revoked":
            return t(
              "errors.qrRevoked",
              "تم إلغاء صلاحيتك للوصول إلى محتوى المناسبة. يرجى التواصل مع المضيف."
            );
          case "qr_expired":
            return t(
              "errors.qrExpired",
              "انتهت فترة صلاحية الرابط. لم يعد محتوى المناسبة متاحاً عبر هذا الرابط."
            );
          case "qr_invalid":
          default:
            return (
              fallback || t("errors.invalidToken", "رابط غير صالح أو منتهي الصلاحية.")
            );
        }
      },
    [t]
  );

const PostEventPage = () => {
  const { t } = useTranslation("postEvent");
  const searchParams = useSearchParams();
  const reasonToMessage = useReasonToMessage(t);

  const token = searchParams.get("token");

  // ------------------------------------------------------------------
  // Session fallback: if no token in URL, check cookie-based session
  // ------------------------------------------------------------------
  const sessionEventId = !token ? guestTokenUtils.getEventId() : null;
  const hasSession = !token && !!guestTokenUtils.getToken() && !!sessionEventId;

  // ------------------------------------------------------------------
  // React Query: validate token (only when token is present in URL)
  // ------------------------------------------------------------------
  const {
    data: validateData,
    isLoading: isValidating,
    error: validateError,
  } = useValidatePostEventToken(token);

  // ------------------------------------------------------------------
  // Derive authenticated state and event ID from query result
  // ------------------------------------------------------------------
  const isAuthenticated = hasSession || (validateData?.valid === true);
  const eventId =
    (validateData?.event?._id) ||
    (hasSession ? sessionEventId : null);
  const guestInfo = validateData?.guest || null;
  const eventInfo = validateData?.event || null;

  // ------------------------------------------------------------------
  // React Query: fetch post-event content once authenticated
  // ------------------------------------------------------------------
  const {
    data: content,
    isLoading: isContentLoading,
  } = usePostEventContent(eventId, { enabled: isAuthenticated && !!eventId });

  // ------------------------------------------------------------------
  // Derive auth error message
  // ------------------------------------------------------------------
  const authError = useMemo(() => {
    if (isValidating) return null;

    // No token and no valid session
    if (!token && !hasSession) {
      return t("errors.noToken", "يرجى استخدام الرابط المرسل إليك.");
    }

    // Validation returned valid:false (200 shape, no error thrown)
    if (!isAuthenticated && validateData && validateData.valid === false) {
      return reasonToMessage(validateData.reason || "qr_invalid");
    }

    // Network / HTTP error from the query
    if (validateError) {
      const reason =
        validateError?.response?.data?.reason ||
        validateError?.response?.data?.body?.reason ||
        null;
      if (reason) return reasonToMessage(reason);
      return (
        validateError?.response?.data?.message ||
        validateError.message ||
        t("errors.validationFailed", "فشل التحقق من الرابط.")
      );
    }

    return null;
  }, [isValidating, token, hasSession, isAuthenticated, validateData, validateError, reasonToMessage, t]);

  // Loading state
  if (isValidating) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <SimpleLoading message={t("loading", "جاري التحميل...")} />
        </div>
      </div>
    );
  }

  // Error state
  if (authError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>{t("errors.accessError", "خطأ في الوصول")}</h2>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PostEventContent
        content={content}
        eventInfo={eventInfo}
        guestInfo={guestInfo}
        eventId={eventId}
        loading={isContentLoading}
      />
    </div>
  );
};

export default PostEventPage;
