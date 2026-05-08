"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useUpdateThankYouMessage } from "@/hooks/reactQueryHooks/post-event/useHostPostEvent";
import { handleError } from "@/services/errorHandlingService";
import styles from "./thankYouEditor.module.css";

const ThankYouEditor = ({ eventId, initial, initialDescription }) => {
  const { t } = useTranslation("postEvent");
  const update = useUpdateThankYouMessage();

  const [text, setText] = useState(initial?.text || "");
  const [textAr, setTextAr] = useState(initial?.textAr || "");
  const [description, setDescription] = useState(
    initialDescription?.description || ""
  );
  const [descriptionAr, setDescriptionAr] = useState(
    initialDescription?.descriptionAr || ""
  );

  useEffect(() => {
    setText(initial?.text || "");
    setTextAr(initial?.textAr || "");
    setDescription(initialDescription?.description || "");
    setDescriptionAr(initialDescription?.descriptionAr || "");
  }, [initial?.text, initial?.textAr, initialDescription?.description, initialDescription?.descriptionAr]);

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {};
    if (text) payload.text = text;
    if (textAr) payload.textAr = textAr;
    if (description) payload.description = description;
    if (descriptionAr) payload.descriptionAr = descriptionAr;

    if (Object.keys(payload).length === 0) {
      toast.error(t("host.thankYouMessage.atLeastOne"));
      return;
    }

    update.mutate(
      { eventId, data: payload },
      {
        onSuccess: () => toast.success(t("host.thankYouMessage.saveSuccess")),
        onError: (error) => {
          handleError(error, t);
          toast.error(t("host.thankYouMessage.saveFailed"));
        },
      }
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSave}>
      <h3 className={styles.title}>{t("host.thankYouMessage.title")}</h3>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>{t("host.thankYouMessage.titleEn")}</span>
          <input
            type="text"
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("host.thankYouMessage.placeholder")}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t("host.thankYouMessage.titleAr")}</span>
          <input
            type="text"
            className={styles.input}
            value={textAr}
            onChange={(e) => setTextAr(e.target.value)}
            placeholder={t("host.thankYouMessage.placeholder")}
            dir="rtl"
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>{t("host.thankYouMessage.descriptionEn")}</span>
          <textarea
            className={styles.textarea}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t("host.thankYouMessage.descriptionAr")}</span>
          <textarea
            className={styles.textarea}
            rows={4}
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
            dir="rtl"
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={update.isPending}
        >
          {update.isPending ? "…" : t("host.thankYouMessage.save")}
        </button>
      </div>
    </form>
  );
};

export default ThankYouEditor;
