"use client";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styles from "./MediaViewerModal.module.css";

export default function MediaViewerModal({ attachment: singleAttachment, attachments,
  onClose, closeLabel = "Close", openLabel = "Open in new tab",
  previousLabel = "Previous media", nextLabel = "Next media", title = "Show media" }) {
  const media = (attachments || [singleAttachment]).filter((item) => item?.url);
  const [index, setIndex] = useState(0);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const attachment = media[index % (media.length || 1)];
  const move = (delta) => setIndex((value) => (value + delta + media.length) % media.length);

  useEffect(() => { setIndex(0); }, [attachments, singleAttachment]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previousFocus?.focus?.(); };
  }, []);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (media.length > 1 && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        setIndex((value) => (value + (event.key === "ArrowRight" ? 1 : -1) + media.length) % media.length);
      }
      if (event.key === "Tab") {
        const items = dialogRef.current?.querySelectorAll('button, a[href], video[controls]');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, media.length]);
  if (!attachment) return null;
  const isVideo = attachment.type === "video" || (attachment.mimeType || "").startsWith("video/");
  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className={styles.content} onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>×</button>
        {isVideo ? (
          <video className={styles.media} key={attachment.url} src={attachment.url} controls autoPlay playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.media} src={attachment.url} alt={title} />
        )}
        {media.length > 1 && <div className={styles.navigation} dir="ltr">
          <button type="button" onClick={() => move(-1)} aria-label={previousLabel}>‹</button>
          <span aria-live="polite">{index + 1} / {media.length}</span>
          <button type="button" onClick={() => move(1)} aria-label={nextLabel}>›</button>
        </div>}
        <a className={styles.openNewTab} href={attachment.url} target="_blank" rel="noopener noreferrer">{openLabel}</a>
      </div>
    </div>, document.body
  );
}
