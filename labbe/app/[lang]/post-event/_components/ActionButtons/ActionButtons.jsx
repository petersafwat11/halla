"use client";
import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePostEventMutation } from "@/hooks/reactQueryHooks/usePostEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./actionButtons.module.css";

const ActionButtons = ({ eventId, postId }) => {
  const { t } = useTranslation("postEvent");
  const [isLiked, setIsLiked] = useState(false);

  const likeMutation = usePostEventMutation("likeContent");
  const unlikeMutation = usePostEventMutation("unlikeContent");

  const handleLike = useCallback(() => {
    if (!eventId || !postId) {
      setIsLiked((prev) => !prev);
      return;
    }

    if (isLiked) {
      unlikeMutation.mutate(
        { eventId, contentId: postId },
        {
          onSuccess: () => setIsLiked(false),
          onError: (error) => handleError(error, t),
        }
      );
    } else {
      likeMutation.mutate(
        { eventId, contentId: postId },
        {
          onSuccess: () => setIsLiked(true),
          onError: (error) => handleError(error, t),
        }
      );
    }
  }, [eventId, postId, isLiked, likeMutation, unlikeMutation, t]);

  return (
    <div className={styles.actionButtonsContainer}>
      <button
        className={`${styles.iconButton} ${isLiked ? styles.liked : ""}`}
        onClick={handleLike}
        aria-label={t("aria.like", "Like")}
        disabled={likeMutation.isPending || unlikeMutation.isPending}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 20.25C12 20.25 2.625 15 2.625 8.62501C2.625 7.49803 3.01546 6.40585 3.72996 5.53431C4.44445 4.66277 5.43884 4.0657 6.54393 3.84468C7.64903 3.62366 8.79657 3.79235 9.79131 4.32204C10.7861 4.85174 11.5665 5.70972 12 6.75001C12.4335 5.70972 13.2139 4.85174 14.2087 4.32204C15.2034 3.79235 16.351 3.62366 17.4561 3.84468C18.5612 4.0657 19.5555 4.66277 20.27 5.53431C20.9845 6.40585 21.375 7.49803 21.375 8.62501C21.375 15 12 20.25 12 20.25Z"
            stroke="currentColor"
            fill={isLiked ? "currentColor" : "none"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button className={styles.iconButton} aria-label={t("aria.comment", "Comment")}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
};

export default ActionButtons;
