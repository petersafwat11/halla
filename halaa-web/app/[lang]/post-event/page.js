"use client";
import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import PostEventContent from "./_components/PostEventContent/PostEventContent";
import {
  useValidatePostEventToken,
  usePostEventContent,
} from "@/hooks/postEvent";
import { guestTokenUtils } from "@/services/guestTokenUtils";
import styles from "./page.module.css";

// Render distinct messages per structured `qr_*` reason returned by
// GuestAccessToken.validateToken (qr_rotated / qr_revoked / qr_expired /
// qr_invalid). 410 vs 403 — rotated/revoked/expired share Gone semantics.
const useReasonToMessage = (t) =>
  useMemo(
    () => (reason, fallback) => {
      switch (reason) {
        case "qr_rotated":
          return t("errors.qrRotated");
        case "qr_revoked":
          return t("errors.qrRevoked");
        case "qr_expired":
          return t("errors.qrExpired");
        case "qr_invalid":
        default:
          return fallback || t("errors.qrInvalid");
      }
    },
    [t]
  );

const PostEventPage = () => {
  const { t } = useTranslation("postEvent");
  const searchParams = useSearchParams();
  const reasonToMessage = useReasonToMessage(t);

  const token = searchParams.get("token");

  // Session fallback: no `?token=` in URL → resume from cookie + sessionStorage.
  const sessionEventId = !token ? guestTokenUtils.getEventId() : null;
  const hasSession =
    !token && !!guestTokenUtils.getToken() && !!sessionEventId;

  const {
    data: validateData,
    isLoading: isValidating,
    error: validateError,
  } = useValidatePostEventToken(token);

  // Memoised so it's stable across renders and the
  // `authError` useMemo below can list it as an explicit dep without
  // re-running on every parent render.
  const validatePayload = useMemo(
    () => validateData?.data ?? validateData,
    [validateData]
  );
  const isAuthenticated = hasSession || validatePayload?.valid === true;
  const eventId =
    validatePayload?.event?._id || (hasSession ? sessionEventId : null);
  const guestInfo = validatePayload?.guest || null;
  const eventInfo = validatePayload?.event || null;
  const guestId = guestInfo?._id || null;

  // Persist the guest session token (returned by /validate) so the axios
  // interceptor attaches it to content/like/comment requests, and so a refresh
  // without ?token= can resume from the cookie. Set synchronously during
  // render (not in an effect) so the cookie is in place before the content
  // query's fetch fires on this same commit.
  if (typeof window !== "undefined" && validatePayload?.sessionToken) {
    if (guestTokenUtils.getToken() !== validatePayload.sessionToken) {
      guestTokenUtils.setToken(validatePayload.sessionToken);
    }
    if (eventId) guestTokenUtils.setEventId(eventId);
  }

  const { data: contentResponse, isLoading: isContentLoading } =
    usePostEventContent(eventId, {
      enabled: isAuthenticated && !!eventId,
    });
  const content = contentResponse?.data ?? contentResponse;

  const authError = useMemo(() => {
    if (isValidating) return null;

    if (!token && !hasSession) {
      return t("errors.noToken");
    }

    if (
      !isAuthenticated &&
      validatePayload &&
      validatePayload.valid === false
    ) {
      return reasonToMessage(validatePayload.reason || "qr_invalid");
    }

    if (validateError) {
      const reason =
        validateError?.response?.data?.reason ||
        validateError?.response?.data?.body?.reason ||
        null;
      if (reason) return reasonToMessage(reason);
      return (
        validateError?.response?.data?.message ||
        validateError.message ||
        t("errors.qrLookup")
      );
    }

    return null;
  }, [
    isValidating,
    token,
    hasSession,
    isAuthenticated,
    validatePayload,
    validateError,
    reasonToMessage,
    t,
  ]);

  if (isValidating) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <SimpleLoading message={t("loading")} />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>{t("errors.accessError")}</h2>
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
        guestId={guestId}
        eventId={eventId}
        loading={isContentLoading}
      />
    </div>
  );
};

export default PostEventPage;
