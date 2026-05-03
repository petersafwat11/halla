"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import PostEventContent from "./_components/PostEventContent/PostEventContent";
import { postEventService } from "@/services/postEvent";
import styles from "./page.module.css";

const PostEventPage = () => {
  const { t } = useTranslation("postEvent");
  const searchParams = useSearchParams();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Guest and event data
  const [guestInfo, setGuestInfo] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [eventId, setEventId] = useState(null);

  // Content data
  const [content, setContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);

  // H-16: render distinct messages per structured `qr_*` reason returned by
  // GuestAccessToken.validateToken. Previously the page collapsed every
  // failure into a single "رابط غير صالح أو منتهي الصلاحية" string,
  // wasting the structured reason the backend ships in the 410 body.
  // Reasons:
  //   - qr_rotated  → guest scanned a rotated link; ask them to use the
  //                   newest message they received
  //   - qr_revoked  → host revoked their access; ask them to contact host
  //   - qr_expired  → access window ended; explain politely
  //   - qr_invalid  → unknown token (typo / phishing) → generic invalid
  const reasonToMessage = (reason, fallback) => {
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
          fallback ||
          t("errors.invalidToken", "رابط غير صالح أو منتهي الصلاحية.")
        );
    }
  };

  // Validate token on mount
  useEffect(() => {
    const validateAccess = async () => {
      const token = searchParams.get("token");

      try {
        if (token) {
          const response = await postEventService.validateToken(token);
          if (response.data?.valid) {
            setIsAuthenticated(true);
            setGuestInfo(response.data.guest);
            setEventInfo(response.data.event);
            setEventId(response.data.event._id);
          } else {
            // The success path returns valid:false rarely — the 410 errors
            // (rotated/revoked/expired) are surfaced via the catch below
            // because axios treats 4xx as throws. This branch handles a
            // 200-with-valid:false response shape, if any.
            setAuthError(
              reasonToMessage(response.data?.reason || "qr_invalid")
            );
          }
        } else if (postEventService.isAuthenticated()) {
          const storedEventId = postEventService.getCurrentEventId();
          if (storedEventId) {
            setIsAuthenticated(true);
            setEventId(storedEventId);
          } else {
            setAuthError(
              t("errors.noToken", "يرجى استخدام الرابط المرسل إليك.")
            );
          }
        } else {
          setAuthError(t("errors.noToken", "يرجى استخدام الرابط المرسل إليك."));
        }
      } catch (error) {
        console.error("Token validation error:", error);
        // Backend returns 410 Gone with `{ reason, message }` for rotated/
        // revoked/expired tokens. Read the structured reason instead of
        // the generic axios error message.
        const reason =
          error?.response?.data?.reason ||
          error?.response?.data?.body?.reason ||
          null;
        if (reason) {
          setAuthError(reasonToMessage(reason));
        } else {
          setAuthError(
            error?.response?.data?.message ||
              error.message ||
              t("errors.validationFailed", "فشل التحقق من الرابط.")
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateAccess();
  }, [searchParams, t]);

  // Fetch content when authenticated
  useEffect(() => {
    const fetchContent = async () => {
      if (!eventId || !isAuthenticated) return;

      try {
        setContentLoading(true);
        const response = await postEventService.getContent(eventId);
        if (response.data) {
          setContent(response.data);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setContentLoading(false);
      }
    };

    fetchContent();
  }, [eventId, isAuthenticated]);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>{t("loading", "جاري التحميل...")}</p>
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
        loading={contentLoading}
      />
    </div>
  );
};

export default PostEventPage;
