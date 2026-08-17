"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./MediaAttachmentInput.module.css";

/**
 * MediaAttachmentInput
 *
 * Single-file picker that accepts ONE image OR ONE video, with a local
 * preview and a remove control. Designed for the support-ticket create forms
 * (host / vendor / admin). The picked File is held in the PARENT's component
 * state (not react-hook-form) and appended to a FormData on submit under the
 * agreed field name `ticketAttachment`.
 *
 * Props:
 *  - value:    File | null       currently-picked file
 *  - onChange: (File|null) => void
 *  - t:        translation fn (namespace with a `popup.*` subtree)
 *  - label:    optional heading above the control
 *  - disabled: boolean
 */
const MAX_SIZE = 50 * 1024 * 1024; // 50MB — matches backend uploadMedia cap

const MediaAttachmentInput = ({ value = null, onChange, t, label, disabled = false }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  // Object URL for the local preview; revoked on change/unmount.
  useEffect(() => {
    if (value && typeof value !== "string") {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
    return undefined;
  }, [value]);

  const isVideo = !!value && (value.type || "").startsWith("video/");
  const isImage = !!value && (value.type || "").startsWith("image/");

  const handleSelect = (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    const type = file.type || "";
    if (!type.startsWith("image/") && !type.startsWith("video/")) {
      setError(t("popup.attachmentInvalidType", "Only image or video files are allowed"));
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(t("popup.attachmentTooLarge", "File is too large (max 50MB)"));
      return;
    }
    setError("");
    onChange?.(file);
  };

  const handleInputChange = (e) => {
    handleSelect(e.target.files);
    // Reset so picking the same file again still fires change.
    e.target.value = "";
  };

  const triggerInput = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleRemove = () => {
    setError("");
    onChange?.(null);
  };

  const formatSize = (bytes) =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} ${t("popup.mb", "MB")}`
      : `${Math.max(1, Math.round(bytes / 1024))} ${t("popup.kb", "KB")}`;

  return (
    <div className={styles.container}>
      {label && <p className={styles.label}>{label}</p>}

      {!value ? (
        <button
          type="button"
          className={styles.dropzone}
          onClick={triggerInput}
          disabled={disabled}
        >
          <span className={styles.addBadge}>
            + {t("popup.attachmentAdd", "Attach image or video")}
          </span>
          <span className={styles.hint}>
            {t("popup.attachmentHint", "Optional — image or video, up to 50MB")}
          </span>
        </button>
      ) : (
        <div className={styles.preview}>
          <div className={styles.thumbWrap}>
            {isImage && previewUrl ? (
              <Image
                src={previewUrl}
                alt={value.name || "attachment"}
                width={56}
                height={56}
                className={styles.thumb}
                unoptimized
              />
            ) : (
              <video className={styles.thumb} src={previewUrl || undefined} muted playsInline />
            )}
          </div>
          <div className={styles.fileMeta}>
            <p className={styles.fileName} title={value.name}>
              {value.name}
            </p>
            <p className={styles.fileSize}>
              {isVideo ? t("popup.video", "Video") : t("popup.image", "Image")} ·{" "}
              {formatSize(value.size)}
            </p>
          </div>
          <button
            type="button"
            className={styles.removeBtn}
            onClick={handleRemove}
            disabled={disabled}
            aria-label={t("popup.attachmentRemove", "Remove attachment")}
          >
            ×
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleInputChange}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default MediaAttachmentInput;
