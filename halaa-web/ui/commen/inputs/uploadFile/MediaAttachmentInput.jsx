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

const MediaAttachmentInput = ({ value = [], onChange, t, label, disabled = false }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const files = Array.isArray(value) ? value : value ? [value] : [];
  const [previewUrls, setPreviewUrls] = useState([]);

  // Object URL for the local preview; revoked on change/unmount.
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [value]);

  const handleSelect = (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;
    if (selected.some(file => !file.type?.startsWith("image/") && !file.type?.startsWith("video/"))) {
      setError(t("popup.attachmentInvalidType", "Only image or video files are allowed"));
      return;
    }
    if (selected.some(file => file.size > MAX_SIZE)) {
      setError(t("popup.attachmentTooLarge", "File is too large (max 50MB)"));
      return;
    }
    setError("");
    if (files.length + selected.length > 4) {
      setError(t("popup.attachmentTooMany", "You can attach up to 4 files"));
      return;
    }
    onChange?.([...files, ...selected]);
  };

  const handleInputChange = (e) => {
    handleSelect(e.target.files);
    // Reset so picking the same file again still fires change.
    e.target.value = "";
  };

  const triggerInput = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleRemove = (index) => {
    setError("");
    onChange?.(files.filter((_, itemIndex) => itemIndex !== index));
  };

  const formatSize = (bytes) =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} ${t("popup.mb", "MB")}`
      : `${Math.max(1, Math.round(bytes / 1024))} ${t("popup.kb", "KB")}`;

  return (
    <div className={styles.container}>
      {label && <p className={styles.label}>{label}</p>}

      {files.length < 4 && (
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
      )}
      {files.map((file, index) => {
        const isVideo = file.type?.startsWith("video/");
        const isImage = file.type?.startsWith("image/");
        return <div className={styles.preview} key={`${file.name}-${file.size}-${index}`}>
          <div className={styles.thumbWrap}>
            {isImage && previewUrls[index] ? (
              <Image
                src={previewUrls[index]}
                alt={file.name || "attachment"}
                width={56}
                height={56}
                className={styles.thumb}
                unoptimized
              />
            ) : (
              <video className={styles.thumb} src={previewUrls[index] || undefined} muted playsInline />
            )}
          </div>
          <div className={styles.fileMeta}>
            <p className={styles.fileName} title={file.name}>
              {file.name}
            </p>
            <p className={styles.fileSize}>
              {isVideo ? t("popup.video", "Video") : t("popup.image", "Image")} ·{" "}
              {formatSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => handleRemove(index)}
            disabled={disabled}
            aria-label={t("popup.attachmentRemove", "Remove attachment")}
          >
            ×
          </button>
        </div>;
      })}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleInputChange}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default MediaAttachmentInput;
