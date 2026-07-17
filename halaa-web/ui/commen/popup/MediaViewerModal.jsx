"use client";
import React from "react";
import ReactDOM from "react-dom";
import styles from "./MediaViewerModal.module.css";

/**
 * MediaViewerModal
 *
 * Full-screen overlay that displays a single image OR video attachment.
 * Used by the admin ticket detail view to open an uploaded ticket
 * attachment in a popup. Renders a `<video controls>` for videos and an
 * `<img>` for images (S3 URLs come pre-signed to public URLs).
 *
 * Props:
 *  - attachment: { url, type, mimeType } | null
 *  - onClose:    () => void
 *  - closeLabel: string (aria-label / title for the close button)
 *  - openLabel:  string (label for the "open in new tab" link)
 */
const MediaViewerModal = ({
  attachment,
  onClose,
  closeLabel = "Close",
  openLabel = "Open in new tab",
}) => {
  if (!attachment?.url) return null;

  const isVideo =
    attachment.type === "video" || (attachment.mimeType || "").startsWith("video/");

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
        >
          ×
        </button>

        {isVideo ? (
          <video className={styles.media} src={attachment.url} controls autoPlay playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.media} src={attachment.url} alt="attachment" />
        )}

        <a
          className={styles.openNewTab}
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {openLabel}
        </a>
      </div>
    </div>,
    document.body
  );
};

export default MediaViewerModal;
