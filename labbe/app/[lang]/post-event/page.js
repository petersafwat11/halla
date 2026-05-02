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
            setAuthError(
              t("errors.invalidToken", "رابط غير صالح أو منتهي الصلاحية.")
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
        setAuthError(
          error.message || t("errors.validationFailed", "فشل التحقق من الرابط.")
        );
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
