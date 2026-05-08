"use client";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useUploadPostEventMedia } from "@/hooks/reactQueryHooks/post-event/useHostPostEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./mediaUploader.module.css";

const MAX_FILES = 20;
const ACCEPT = "image/*,video/*";

const MediaUploader = ({ eventId }) => {
  const { t } = useTranslation("postEvent");
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const upload = useUploadPostEventMedia();

  const submitFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []).slice(0, MAX_FILES);
      if (!files.length) return;

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      upload.mutate(
        { eventId, formData },
        {
          onSuccess: () => {
            if (inputRef.current) inputRef.current.value = "";
          },
          onError: (error) => {
            handleError(error, t);
            toast.error(t("host.errors.uploadFailed"));
          },
        }
      );
    },
    [eventId, upload, t]
  );

  const onChange = (e) => submitFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    submitFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  return (
    <div
      className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className={styles.hiddenInput}
        onChange={onChange}
        disabled={upload.isPending}
      />
      <p className={styles.hintTitle}>
        {upload.isPending ? t("host.media.uploading") : t("host.media.uploadHint")}
      </p>
      <p className={styles.hintSub}>
        {t("host.media.uploadSubHint")}
      </p>
    </div>
  );
};

export default MediaUploader;
