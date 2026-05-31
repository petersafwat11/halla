"use client";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  useAddPostEventComment,
  usePostEventComments,
} from "@/hooks/postEvent";
import { handleError } from "@/services/errorHandlingService";
import CommentList from "@/components/postEvent/CommentList";
import EmojiPicker from "./EmojiPicker";
import styles from "./commentSection.module.css";

const MAX_IMAGES = 4;

const CommentSection = ({ eventId, inputRef }) => {
  const { t, i18n } = useTranslation("postEvent");
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [page, setPage] = useState(1);

  const addComment = useAddPostEventComment();
  const { data: commentsResp, isLoading: commentsLoading } =
    usePostEventComments({ eventId, page, limit: 20 }, { enabled: !!eventId });

  const payload = commentsResp?.data ?? commentsResp;
  const comments = useMemo(() => payload?.comments || [], [payload]);
  const totalPages = payload?.pagination?.totalPages || 1;

  const ready = !!eventId;

  const onPickFiles = useCallback((e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
    e.target.value = "";
  }, []);

  const removeFile = useCallback((idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const insertEmoji = useCallback((emoji) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef?.current?.focus?.();
  }, [inputRef]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = text.trim();
      if ((!trimmed && files.length === 0) || !ready) return;

      const formData = new FormData();
      // Text is optional when images are attached (backend accepts text and/or
      // image). Always send the field so multipart parsing has it.
      formData.append("text", trimmed);
      // Field name MUST be "images" — the route's `uploadMultipleImages`
      // middleware is `uploadImage.array("images", 10)`.
      files.forEach((f) => formData.append("images", f));

      addComment.mutate(
        { eventId, data: formData },
        {
          onSuccess: (resp) => {
            setText("");
            setFiles([]);
            const pending = (resp?.data ?? resp)?.pendingApproval;
            if (pending) toast.info(t("comments.submittedForReview"));
          },
          onError: (error) => handleError(error, t),
        }
      );
    },
    [text, files, ready, eventId, addComment, t]
  );

  if (!ready) {
    return (
      <div className={styles.commentSectionContainer}>
        <p className={styles.disabledNotice}>{t("comments.unavailable")}</p>
      </div>
    );
  }

  return (
    <div className={styles.commentSectionContainer}>
      {/* Existing comments */}
      <div className={styles.commentsList}>
        <CommentList
          comments={comments}
          locale={i18n.language}
          loading={commentsLoading}
          loadingText={t("loading")}
          emptyText={t("comments.empty")}
        />

        {page < totalPages && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("comments.loadMore")}
          </button>
        )}
      </div>

      {/* Composer */}
      <form className={styles.composer} onSubmit={handleSubmit}>
        {files.length > 0 && (
          <div className={styles.previewChips}>
            {files.map((f, i) => (
              <div key={i} className={styles.previewChip}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(f)}
                  alt=""
                  className={styles.previewImg}
                />
                <button
                  type="button"
                  className={styles.previewRemove}
                  onClick={() => removeFile(i)}
                  aria-label={t("aria.removeImage")}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.composerRow}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("commentPlaceholder")}
            className={styles.commentInput}
          />

          <div className={styles.composerActions}>
            <div className={styles.emojiWrap}>
              <button
                type="button"
                className={styles.attachButton}
                aria-label={t("aria.emoji")}
                onClick={() => setShowEmoji((s) => !s)}
              >
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.3378 17.6755C14.838 17.6755 17.6755 14.838 17.6755 11.3378C17.6755 7.83752 14.838 5 11.3378 5C7.83752 5 5 7.83752 5 11.3378C5 14.838 7.83752 17.6755 11.3378 17.6755Z" stroke="currentColor" strokeWidth="1.36896" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.81641 12.5977C8.81641 12.5977 9.76122 13.8574 11.3359 13.8574C12.9106 13.8574 13.8554 12.5977 13.8554 12.5977" stroke="currentColor" strokeWidth="1.36896" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.44922 9.44922H9.45682" stroke="currentColor" strokeWidth="1.36896" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.2266 9.44922H13.2342" stroke="currentColor" strokeWidth="1.36896" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {showEmoji && (
                <EmojiPicker
                  onSelect={insertEmoji}
                  onClose={() => setShowEmoji(false)}
                />
              )}
            </div>

            <label
              className={styles.attachButton}
              aria-label={t("aria.attachImage")}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className={styles.hiddenFileInput}
                onChange={onPickFiles}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>

            <button
              type="submit"
              className={styles.sendButton}
              disabled={
                (!text.trim() && files.length === 0) || addComment.isPending
              }
            >
              {t("sendButton")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
