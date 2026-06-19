"use client";
/**
 * StepThree (visual template) — backend-driven thumbnail grid; selecting
 * a thumbnail opens TemplateForm, which renders the dynamic fields and
 * bakes the canvas into an image at save.
 *
 * Two modes (mutually exclusive):
 *   - "template": pick a predefined template, fill the dynamic fields,
 *                 the wizard bakes the customised canvas to an image.
 *   - "upload":   the host uploads their own ready-made invitation card.
 *                 No form fields, no overlays — the uploaded image is
 *                 stored on `visualTemplate.bakedImagePath` with
 *                 `isCustomUpload: true` so messaging and previews use
 *                 it directly.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FaCheckCircle } from "react-icons/fa";
import { FiUploadCloud, FiImage, FiTrash2, FiEdit3 } from "react-icons/fi";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./stepThree.module.css";
import TemplateForm from "../templateForm/TemplateForm";
import UseLanguageChange from "@/hooks/UseLanguageChange";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { toastUtils } from "@/utils/toastUtils";
import {
  useHostTemplates,
  useTemplateCategories,
} from "@/hooks/templates";
import TemplatesCards from "./templatesCards/TemplatesCards";
import TemplatePreviewCanvas from "@/components/shared/TemplatePreviewCanvas";

// Server-side limit lives in s3Upload.js (uploadInvitationImage, 10MB).
// Keep this in sync so the host sees a friendly error before upload.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const StepThree = () => {
  const { setValue, watch } = useFormContext();
  const { t } = useTranslation("createEvent");
  const { currentLocale } = UseLanguageChange();
  const isAr = currentLocale === "ar";

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const fileInputRef = useRef(null);

  const { data: catData } = useTemplateCategories({ admin: false });
  const { data: tplData, isLoading } = useHostTemplates({
    category: selectedCategory,
  });
  const categories = catData?.data?.categories || [];
  const templates = useMemo(
    () => tplData?.data?.templates || [],
    [tplData],
  );

  const templateImage = watch("templateImage");
  const visualTemplate = watch("visualTemplate");

  // Mode resolution. Upload mode is sticky: once the host enters it (or
  // a saved event was created in upload mode), templates are hidden
  // until they explicitly switch back.
  const isUploadMode = !!visualTemplate?.isCustomUpload;
  const [mode, setMode] = useState(isUploadMode ? "upload" : "template");

  // Keep local mode in lock-step with form state on remote reset
  // (the update wizard re-seeds from the API after eventRaw lands).
  useEffect(() => {
    setMode(isUploadMode ? "upload" : "template");
  }, [isUploadMode]);

  const selectedRef =
    visualTemplate?.templateRef || visualTemplate?._id || visualTemplate?.id;
  const checkedTemplate =
    templates.find((tpl) => tpl._id === selectedRef) ||
    templates.find(
      (tpl) => (tpl.thumbnailUrl || tpl.imageUrl) === templateImage,
    ) ||
    null;

  const handleTemplateSelect = (template) => {
    const existingValues =
      visualTemplate &&
      (visualTemplate.templateRef === template._id ||
        visualTemplate._id === template._id)
        ? visualTemplate.fieldValues || visualTemplate.data
        : null;
    setActiveTemplate({
      ...template,
      // The full-size original is preferred, while the thumbnail is a
      // reliable fallback for older template records/storage policies.
      previewImageUrl: template.imageUrl || template.thumbnailUrl,
      fieldValues: existingValues || {},
      data: existingValues || {},
    });
    // Never let a newly selected template inherit the prior template's bake.
    setValue("templateImage", "", { shouldValidate: true });
    setShowTemplateForm(true);
  };

  const handleSetEventValues = (key, value) => {
    if (key === "selectedTemplate") {
      const next = {
        ...value,
        templateRef: value?._id || value?.templateRef,
        fieldValues: value?.fieldValues || value?.data || {},
        isCustomUpload: false,
      };
      setValue("visualTemplate", next, { shouldValidate: false });
      return;
    }
    setValue(key, value, { shouldValidate: key === "templateImage" });
  };

  // ── Mode switching ─────────────────────────────────────────────────
  const switchToTemplateMode = () => {
    if (mode === "template") return;
    setMode("template");
    // Wipe any uploaded asset so the host re-picks from the grid.
    setValue(
      "visualTemplate",
      null,
      { shouldValidate: true },
    );
    setValue("templateImage", "", { shouldValidate: true });
  };

  const switchToUploadMode = () => {
    if (mode === "upload") return;
    setMode("upload");
    // Discard any prior predefined template selection so the wizard's
    // step-3 validator falls back to the uploaded image alone.
    setValue(
      "visualTemplate",
      { isCustomUpload: true, fieldValues: {} },
      { shouldValidate: true },
    );
    setValue("templateImage", "", { shouldValidate: true });
  };

  // ── File handling ──────────────────────────────────────────────────
  const validateFile = (file) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      toastUtils.error(
        t("upload_card_invalid_type"),
      );
      return false;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toastUtils.error(
        t("upload_card_too_big"),
      );
      return false;
    }
    return true;
  };

  const handleFilePicked = (file) => {
    if (!file || !validateFile(file)) return;
    setValue(
      "visualTemplate",
      { isCustomUpload: true, fieldValues: {} },
      { shouldValidate: true },
    );
    setValue("templateImage", file, { shouldValidate: true });
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFilePicked(file);
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFilePicked(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ── Remove selection ───────────────────────────────────────────────
  const handleRemoveSelection = () => {
    setValue("visualTemplate", null, { shouldValidate: true });
    setValue("templateImage", "", { shouldValidate: true });
    setMode("template");
  };

  // Preview source: File → object URL; string → resolve relative paths to
  // absolute URLs so the confirmed card image loads from the backend server.
  const previewUrl = useMemo(() => {
    if (!templateImage) return null;
    if (typeof templateImage === "string") {
      if (
        templateImage.startsWith("http") ||
        templateImage.startsWith("/") ||
        templateImage.startsWith("blob:")
      )
        return templateImage;
      // Relative path (e.g. "uploads/…") — prepend the API base URL.
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";
      const baseUrl = apiUrl.replace(/\/api\/v\d+$/, "").replace(/\/api$/, "");
      return `${baseUrl}/${templateImage}`;
    }
    if (templateImage instanceof File) return URL.createObjectURL(templateImage);
    return null;
  }, [templateImage]);

  useEffect(() => {
    // Revoke object URL on cleanup when previewUrl came from a File.
    if (templateImage instanceof File && previewUrl) {
      return () => URL.revokeObjectURL(previewUrl);
    }
    return undefined;
  }, [templateImage, previewUrl]);

  // The selection is "confirmed" when the user has completed the
  // customisation modal (template mode) or uploaded an image (upload mode).
  // In template mode, `templateImage` becomes truthy only after bake.
  //
  // For update-mode (previously saved events), the template may have been
  // deleted from the database since the event was created. We still show
  // the confirmed card as long as a `templateRef` + `templateImage` exist
  // on the saved `visualTemplate` — the host can remove and re-pick.
  const hasTemplateRef = !!(
    visualTemplate?.templateRef || visualTemplate?._id
  );
  const hasConfirmedSelection =
    (mode === "template" &&
      (checkedTemplate || hasTemplateRef) &&
      !!templateImage) ||
    (mode === "upload" && !!previewUrl);

  // Resolved preview URI for the confirmed card.
  const confirmedPreviewUrl = mode === "upload" ? previewUrl : previewUrl;

  return (
    <div className={styles.stepThree}>
      <div className={styles.templateSection}>

        {hasConfirmedSelection ? (
          /* ── Confirmed selection card ─────────────────────────────── */
          <div className={styles.confirmedCard}>
            <p className={styles.confirmedCardLabel}>
              {mode === "upload"
                ? t("uploaded_design_label")
                : t("confirmed_design_label")}
            </p>
            <div className={styles.confirmedCardImageWrapper}>
              {mode === "template" &&
              (checkedTemplate?.imageUrl ||
                checkedTemplate?.thumbnailUrl ||
                visualTemplate?.imageUrl ||
                visualTemplate?.thumbnailUrl) ? (
                <TemplatePreviewCanvas
                  template={checkedTemplate || visualTemplate}
                  data={
                    visualTemplate?.fieldValues || visualTemplate?.data || {}
                  }
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={confirmedPreviewUrl}
                  alt={t("uploaded_card_preview")}
                  className={styles.confirmedCardImg}
                />
              )}
            </div>
            {mode === "template" && checkedTemplate && (
              <p className={styles.confirmedCardTemplateName}>
                {isAr ? checkedTemplate.nameAr : checkedTemplate.nameEn}
              </p>
            )}
            {mode === "template" && !checkedTemplate && hasTemplateRef && (
              <p className={styles.confirmedCardTemplateName}>
                {visualTemplate?.templateName ||
                  visualTemplate?.name ||
                  t("saved_design", "Saved Design")}
              </p>
            )}
            <div className={styles.confirmedCardActions}>
              <button
                type="button"
                className={styles.confirmedRemoveBtn}
                onClick={handleRemoveSelection}
              >
                <FiTrash2 size={14} />
                {t("remove_selection")}
              </button>
              {mode === "template" && checkedTemplate && (
                <button
                  type="button"
                  className={styles.confirmedEditBtn}
                  onClick={() => handleTemplateSelect(checkedTemplate)}
                >
                  <FiEdit3 size={14} />
                  {t("edit_design_template")}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── Selection UI (toggle + grid / dropzone) ─────────────── */
          <>
            {/* Mode toggle — predefined templates vs custom upload. */}
            <div className={styles.modeToggle} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "template"}
                className={`${styles.modeToggleBtn} ${
                  mode === "template" ? styles.modeToggleBtnActive : ""
                }`}
                onClick={switchToTemplateMode}
              >
                <FiImage size={16} />
                <span>
                  {t("choose_from_templates")}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "upload"}
                className={`${styles.modeToggleBtn} ${
                  mode === "upload" ? styles.modeToggleBtnActive : ""
                }`}
                onClick={switchToUploadMode}
              >
                <FiUploadCloud size={16} />
                <span>
                  {t("upload_own_card")}
                </span>
              </button>
            </div>

            {mode === "template" && (
              <>
                <div className={styles.tabs}>
                  <button
                    type="button"
                    className={`${styles.tab} ${
                      selectedCategory === "" ? styles.active : ""
                    }`}
                    onClick={() => setSelectedCategory("")}
                  >
                    {t("all_categories")}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c._id || c.code}
                      type="button"
                      className={`${styles.tab} ${
                        selectedCategory === c.code ? styles.active : ""
                      }`}
                      onClick={() => setSelectedCategory(c.code)}
                    >
                      {isAr ? c.nameAr : c.nameEn}
                    </button>
                  ))}
                </div>

                {isLoading ? (
                  <SimpleLoading />
                ) : templates.length === 0 ? (
                  <p className={styles.emptyMessage}>
                    {t("no_templates_available")}
                  </p>
                ) : (
                  <TemplatesCards
                    templates={templates}
                    selectedTemplate={checkedTemplate}
                    onTemplateSelect={handleTemplateSelect}
                  />
                )}

                {checkedTemplate && (
                  <p className={styles.selectedLabel}>
                    {t("selected_template")}:{" "}
                    <span className={styles.selectedName}>
                      {isAr
                        ? checkedTemplate.nameAr
                        : checkedTemplate.nameEn}
                    </span>
                  </p>
                )}
              </>
            )}

            {mode === "upload" && (
              <div className={styles.uploadSection}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_MIME.join(",")}
                  onChange={handleInputChange}
                  className={styles.uploadInputHidden}
                  aria-hidden="true"
                  tabIndex={-1}
                />

                {previewUrl ? (
                  <div className={styles.uploadPreviewWrapper}>
                    <div className={styles.uploadPreview}>
                      {/* next/image with `unoptimized` because blob: and
                          freshly uploaded S3 URLs aren't in next.config.
                          Plain <img> avoids the loader warning. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={t("uploaded_card_preview")}
                        className={styles.uploadPreviewImg}
                      />
                    </div>
                    <div className={styles.uploadActions}>
                      <button
                        type="button"
                        className={styles.uploadReplaceBtn}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FiUploadCloud size={14} />
                        {t("replace_image")}
                      </button>
                    </div>
                    <p className={styles.uploadHintSmall}>
                      {t("upload_card_saved_hint")}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.uploadDropzone}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                  >
                    <FiUploadCloud size={32} className={styles.uploadDropzoneIcon} />
                    <span className={styles.uploadDropzoneTitle}>
                      {t("upload_card_cta")}
                    </span>
                    <span className={styles.uploadDropzoneHint}>
                      {t("upload_card_hint")}
                    </span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <TemplateForm
        isOpen={showTemplateForm}
        onClose={() => setShowTemplateForm(false)}
        locale={currentLocale}
        setEventValues={handleSetEventValues}
        template={activeTemplate}
      />
    </div>
  );
};

export default StepThree;
