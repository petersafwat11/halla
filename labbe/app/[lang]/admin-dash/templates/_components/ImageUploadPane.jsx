"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import Button from "@/ui/commen/button/Button";
import TemplatePreviewCanvas from "@/components/shared/TemplatePreviewCanvas";
import styles from "./ImageUploadPane.module.css";

export default function ImageUploadPane({
  imageUrl,
  naturalWidth,
  naturalHeight,
  onUpload,
  fileInputRef,
  template,
  sampleData,
}) {
  const { t } = useTranslation("admin");

  if (!imageUrl) {
    return (
      <div className={styles.uploadPlaceholder}>
        <p className={styles.uploadText}>{t("templates.editor.uploadPrompt")}</p>
        <Button
          type="button"
          variant="primary"
          title={t("templates.editor.uploadBtn")}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onUpload}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  return (
    <div>
      <TemplatePreviewCanvas template={template} data={sampleData} />
      <div className={styles.previewMeta}>
        <small className={styles.dimensions}>
          {naturalWidth}&times;{naturalHeight}
        </small>
        <Button
          type="button"
          variant="secondary"
          title={t("templates.editor.changeImage")}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onUpload}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}
