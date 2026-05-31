"use client";
import React from "react";
import { FaUserCircle } from "react-icons/fa";
import styles from "./commentList.module.css";

export const formatRelativeTime = (dateStr, locale) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale || "ar", { numeric: "auto" });
  const table = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of table) {
    if (Math.abs(diffSec) >= secs) {
      return rtf.format(-Math.round(diffSec / secs), unit);
    }
  }
  return rtf.format(-diffSec, "second");
};

const CommentItem = ({ comment, locale }) => {
  const name = comment?.guest?.name || "Guest";
  const images = Array.isArray(comment?.images) ? comment.images : [];
  return (
    <div className={styles.commentItem}>
      <FaUserCircle className={styles.commentAvatar} />
      <div className={styles.commentBody}>
        <div className={styles.commentBubble}>
          <span className={styles.commentName}>{name}</span>
          {comment?.text && <p className={styles.commentText}>{comment.text}</p>}
          {images.length > 0 && (
            <div className={styles.commentImages}>
              {images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img.url}
                  alt=""
                  className={styles.commentImage}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
        <span className={styles.commentTime}>
          {formatRelativeTime(comment?.createdAt, locale)}
        </span>
      </div>
    </div>
  );
};

/**
 * Presentational comment thread, shared by the guest page and the host's
 * published view so both render comments identically.
 */
const CommentList = ({ comments = [], locale, loading, loadingText, emptyText }) => {
  if (loading && comments.length === 0) {
    return <p className={styles.emptyNotice}>{loadingText}</p>;
  }
  if (comments.length === 0) {
    return <p className={styles.emptyNotice}>{emptyText}</p>;
  }
  return (
    <div className={styles.commentsList}>
      {comments.map((c) => (
        <CommentItem key={c._id} comment={c} locale={locale} />
      ))}
    </div>
  );
};

export default CommentList;
