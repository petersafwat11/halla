"use client";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateThankYouMessage } from "@/hooks/postEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./captionEditor.module.css";

/**
 * Single-field post caption (replaces the old 4-field bilingual thank-you
 * editor). Persisted to `content.title` via the existing thank-you endpoint
 * (`{ text }`). Auto-saves on blur when the value changed.
 */
const CaptionEditor = ({ eventId, initial = "", hostName }) => {
  const { t } = useTranslation("postEvent");
  const [value, setValue] = useState(initial);
  const savedRef = useRef(initial);
  const [savedFlash, setSavedFlash] = useState(false);
  const update = useUpdateThankYouMessage();

  useEffect(() => {
    setValue(initial);
    savedRef.current = initial;
  }, [initial]);

  const save = () => {
    if (value === savedRef.current) return;
    update.mutate(
      { eventId, data: { text: value } },
      {
        onSuccess: () => {
          savedRef.current = value;
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 1800);
        },
        onError: (error) => handleError(error, t),
      }
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <span className={styles.avatar} aria-hidden>
          {(hostName || "?").charAt(0).toUpperCase()}
        </span>
        <span className={styles.hostName}>{hostName}</span>
      </div>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder={t("host.caption.placeholder")}
        rows={3}
        maxLength={200}
      />
      <div className={styles.statusRow}>
        {update.isPending && (
          <span className={styles.saving}>{t("host.caption.saving")}</span>
        )}
        {!update.isPending && savedFlash && (
          <span className={styles.saved}>{t("host.caption.saved")}</span>
        )}
      </div>
    </div>
  );
};

export default CaptionEditor;
