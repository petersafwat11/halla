"use client";
import React, { useState } from "react";
import { FaUserCircle, FaEllipsisH } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useReportPostEventContent,
  useBlockPostEventActor,
} from "@/hooks/postEvent";
import styles from "./commentList.module.css";

// Inline AR/EN labels so the moderation menu needs no extra i18n keys.
const MOD = {
  more: { ar: "خيارات", en: "Options" },
  report: { ar: "الإبلاغ", en: "Report" },
  block: { ar: "حظر المستخدم", en: "Block user" },
  spam: { ar: "محتوى مزعج", en: "Spam" },
  harassment: { ar: "تحرّش / إساءة", en: "Harassment" },
  other: { ar: "أخرى", en: "Other" },
  reported: { ar: "تم الإبلاغ. شكرًا لك.", en: "Reported. Thank you." },
  blocked: { ar: "تم الحظر.", en: "Blocked." },
  failed: { ar: "حدث خطأ ما.", en: "Something went wrong." },
};

/**
 * Per-comment Report / Block menu (§6). Only rendered on the guest surface,
 * where `eventId` + the guest session token are present.
 */
const CommentModMenu = ({ eventId, comment, lang }) => {
  const [open, setOpen] = useState(false);
  const report = useReportPostEventContent();
  const block = useBlockPostEventActor();
  const tx = (k) => MOD[k][lang];
  const guestId = comment?.guest?._id;
  if (!guestId) return null;

  const submitReport = (reason) => {
    report.mutate(
      {
        eventId,
        targetType: "post_event_comment",
        targetId: comment._id,
        reportedActorType: "guest",
        reportedActorId: guestId,
        reason,
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(tx("reported"));
        },
        onError: () => toast.error(tx("failed")),
      }
    );
  };

  const doBlock = () => {
    block.mutate(
      { eventId, blockedActorType: "guest", blockedActorId: guestId },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(tx("blocked"));
        },
        onError: () => toast.error(tx("failed")),
      }
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={tx("more")}
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#999",
          padding: 4,
        }}
      >
        <FaEllipsisH size={14} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "100%",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 20,
            minWidth: 160,
            padding: 6,
          }}
        >
          <div style={{ fontSize: 12, color: "#888", padding: "4px 8px" }}>
            {tx("report")}
          </div>
          {["spam", "harassment", "other"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => submitReport(r)}
              style={menuItemStyle}
            >
              {tx(r)}
            </button>
          ))}
          <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />
          <button
            type="button"
            onClick={doBlock}
            style={{ ...menuItemStyle, color: "#e74c3c" }}
          >
            {tx("block")}
          </button>
        </div>
      )}
    </div>
  );
};

const menuItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "start",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "8px 8px",
  fontSize: 13,
  color: "#333",
  borderRadius: 6,
};

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

const CommentItem = ({ comment, locale, eventId }) => {
  const name = comment?.guest?.name || "Guest";
  const images = Array.isArray(comment?.images) ? comment.images : [];
  const lang = String(locale || "ar").startsWith("ar") ? "ar" : "en";
  return (
    <div className={styles.commentItem}>
      <FaUserCircle className={styles.commentAvatar} />
      <div className={styles.commentBody}>
        <div className={styles.commentBubble}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span className={styles.commentName}>{name}</span>
            {eventId ? (
              <CommentModMenu eventId={eventId} comment={comment} lang={lang} />
            ) : null}
          </div>
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
const CommentList = ({
  comments = [],
  locale,
  loading,
  loadingText,
  emptyText,
  eventId,
}) => {
  if (loading && comments.length === 0) {
    return <p className={styles.emptyNotice}>{loadingText}</p>;
  }
  if (comments.length === 0) {
    return <p className={styles.emptyNotice}>{emptyText}</p>;
  }
  return (
    <div className={styles.commentsList}>
      {comments.map((c) => (
        <CommentItem key={c._id} comment={c} locale={locale} eventId={eventId} />
      ))}
    </div>
  );
};

export default CommentList;
