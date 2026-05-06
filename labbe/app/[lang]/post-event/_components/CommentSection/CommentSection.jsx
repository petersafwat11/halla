"use client";
import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePostEventMutation } from "@/hooks/reactQueryHooks/usePostEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./commentSection.module.css";

const CommentSection = ({ eventId, postId }) => {
  const { t } = useTranslation("postEvent");
  const [comment, setComment] = useState("");

  const addCommentMutation = usePostEventMutation("addComment");

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = comment.trim();
      if (!trimmed) return;

      if (!eventId || !postId) {
        // No event/post context yet (demo mode) — clear input only
        setComment("");
        return;
      }

      addCommentMutation.mutate(
        { eventId, contentId: postId, data: { text: trimmed } },
        {
          onSuccess: () => setComment(""),
          onError: (error) => handleError(error, t),
        }
      );
    },
    [comment, eventId, postId, addCommentMutation, t]
  );

  return (
    <div className={styles.commentSectionContainer}>
      <div className={styles.commentInputWrapper}>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
          className={styles.commentInput}
        />
      </div>

      <div className={styles.actionsRow}>
        <button
          onClick={handleSubmit}
          className={styles.sendButton}
          disabled={!comment.trim() || addCommentMutation.isPending}
        >
          {t("sendButton")}
        </button>

        <div className={styles.attachmentButtons}>
          <button className={styles.attachButton} aria-label={t("aria.emoji", "Emoji")}>
            <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11.3378 17.6755C14.838 17.6755 17.6755 14.838 17.6755 11.3378C17.6755 7.83752 14.838 5 11.3378 5C7.83752 5 5 7.83752 5 11.3378C5 14.838 7.83752 17.6755 11.3378 17.6755Z"
                stroke="currentColor"
                strokeWidth="1.36896"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.81641 12.5977C8.81641 12.5977 9.76122 13.8574 11.3359 13.8574C12.9106 13.8574 13.8554 12.5977 13.8554 12.5977"
                stroke="currentColor"
                strokeWidth="1.36896"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.44922 9.44922H9.45682"
                stroke="currentColor"
                strokeWidth="1.36896"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.2266 9.44922H13.2342"
                stroke="currentColor"
                strokeWidth="1.36896"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button className={styles.attachButton} aria-label={t("aria.attachFile", "Attach file")}>
            <svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13.0032 6.80729L7.17875 12.6317C6.46522 13.3452 5.49746 13.7461 4.48837 13.7461C3.47928 13.7461 2.51152 13.3452 1.79799 12.6317C1.08445 11.9182 0.683594 10.9504 0.683594 9.94131C0.683594 8.93223 1.08445 7.96447 1.79799 7.25093L7.6224 1.42652C8.09809 0.950833 8.74326 0.683594 9.41598 0.683594C10.0887 0.683594 10.7339 0.950833 11.2096 1.42652C11.6853 1.90221 11.9525 2.54738 11.9525 3.22011C11.9525 3.89284 11.6853 4.53801 11.2096 5.0137L5.37883 10.8381C5.14098 11.076 4.81839 11.2096 4.48203 11.2096C4.14567 11.2096 3.82308 11.076 3.58524 10.8381C3.34739 10.6003 3.21377 10.2777 3.21377 9.94131C3.21377 9.60495 3.34739 9.28236 3.58524 9.04452L8.966 3.67009"
                stroke="currentColor"
                strokeWidth="1.36896"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentSection;
