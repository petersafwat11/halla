"use client";
/**
 * TemplateEditorPage — Phase 4c W1-VISUAL
 *
 * Two-pane layout per v4.1 §A-2:
 *   - Left:  TemplatePreviewCanvas (read-only, "Preview as Host" toggle)
 *   - Right: FieldConfigPanel (form with template-level + field-level
 *           + overlay-level config; "Add Field" + "Add Overlay" buttons)
 *
 * Form management: react-hook-form with `mode: "onSubmit"` per v4.1
 * [PATCH 10] (admin form has hundreds of registered paths; onChange
 * mode would lag the canvas).
 *
 * FormProvider wraps the entire two-pane editor so descendant
 * components (`useFormContext()` consumers like ColorPickerGroup) work
 * without re-wrapping per v4.1 [PATCH 9].
 *
 * useUnsavedChanges (v4.2 Patch B) guards browser + SPA navigation
 * when the form is dirty.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import { useTemplate, useTemplateCategories, useFonts } from "@/hooks/queries/useTemplates";
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "@/hooks/mutations/useTemplateMutations";
import { templatesService } from "@/services/templatesService";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import TemplatePreviewCanvas from "@/components/shared/TemplatePreviewCanvas";
import FieldConfigPanel from "./FieldConfigPanel";
import { toastUtils } from "@/utils/toastUtils";

const FIELD_TYPES = [
  "text",
  "textarea",
  "date",
  "time",
  "color",
  "font",
  "number",
  "email",
  "password",
];

function makeEmptyTemplate() {
  return {
    nameEn: "",
    nameAr: "",
    categories: [],
    imageUrl: "",
    s3Key: "",
    naturalWidth: 1080,
    naturalHeight: 1350,
    fields: [],
    overlays: [],
    decorations: [],
    sortOrder: 0,
    active: true,
  };
}

function normalize(tpl) {
  if (!tpl) return makeEmptyTemplate();
  return {
    nameEn: tpl.nameEn || "",
    nameAr: tpl.nameAr || "",
    categories: tpl.categories || [],
    imageUrl: tpl.imageUrl || "",
    imageS3Key: tpl.imageS3Key || "",
    s3Key: "",
    thumbnailUrl: tpl.thumbnailUrl || "",
    naturalWidth: tpl.naturalWidth || 1080,
    naturalHeight: tpl.naturalHeight || 1350,
    fields: tpl.fields || [],
    overlays: tpl.overlays || [],
    decorations: tpl.decorations || [],
    sortOrder: tpl.sortOrder || 0,
    active: tpl.active !== false,
  };
}

export default function TemplateEditorPage({ id, lang }) {
  const isNew = id === "new" || !id;
  const router = useRouter();
  const { t } = useTranslation("admin");

  const { data: tplData, isLoading } = useTemplate(isNew ? null : id);
  const { data: catData } = useTemplateCategories({ admin: true });
  const { data: fontsData } = useFonts();

  const create = useCreateTemplate();
  const update = useUpdateTemplate(isNew ? null : id);

  const remoteTpl = tplData?.data?.template || tplData?.template;

  const methods = useForm({
    mode: "onSubmit",
    defaultValues: makeEmptyTemplate(),
  });
  const { handleSubmit, reset, watch, formState } = methods;

  const formValues = watch();

  // Hydrate when remote loads
  useEffect(() => {
    if (!isNew && remoteTpl) reset(normalize(remoteTpl));
    if (isNew) reset(makeEmptyTemplate());
  }, [isNew, remoteTpl, reset]);

  useUnsavedChanges(
    formState.isDirty,
    t("templates.editor.unsavedChangesWarning") ||
      "You have unsaved changes. Are you sure you want to leave?"
  );

  // ── Image upload handler ───────────────────────────────────────────────
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastUtils.error(t("templates.editor.fileTooLarge") || "File too large (5 MB cap)");
      return;
    }
    setUploading(true);
    try {
      const { s3Key } = await templatesService.adminUploadImage(file, {
        templateId: isNew ? "new" : id,
      });
      // We'll preview from a local objectURL until save commits the new key.
      const localUrl = URL.createObjectURL(file);
      methods.setValue("s3Key", s3Key, { shouldDirty: true });
      methods.setValue("imageUrl", localUrl, { shouldDirty: true });
      // Capture natural dimensions from the local image
      const img = new Image();
      img.onload = () => {
        methods.setValue("naturalWidth", img.naturalWidth, { shouldDirty: true });
        methods.setValue("naturalHeight", img.naturalHeight, { shouldDirty: true });
      };
      img.src = localUrl;
      toastUtils.success(t("templates.editor.uploaded") || "Uploaded");
    } catch (err) {
      toastUtils.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Strip preview-only state before send.
      const payload = {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        categories: data.categories,
        fields: data.fields,
        overlays: data.overlays,
        decorations: data.decorations,
        sortOrder: data.sortOrder,
        active: data.active,
      };
      if (isNew) {
        if (!data.s3Key) {
          toastUtils.error(t("templates.editor.imageRequired") || "Upload an image first");
          return;
        }
        const res = await create.mutateAsync({
          ...payload,
          s3Key: data.s3Key,
          naturalWidth: data.naturalWidth,
          naturalHeight: data.naturalHeight,
        });
        const newId = res?.data?.template?._id || res?.template?._id;
        toastUtils.success(t("templates.editor.created") || "Template created");
        if (newId) router.push(`/${lang}/admin-dash/templates/${newId}`);
      } else {
        if (data.s3Key) payload.s3Key = data.s3Key;
        await update.mutateAsync(payload);
        toastUtils.success(t("templates.editor.saved") || "Saved");
        reset({ ...data }, { keepValues: true });
      }
    } catch (err) {
      toastUtils.error(err.message || "Save failed");
    }
  };

  const categories = catData?.data?.categories || catData?.categories || [];
  const fonts = fontsData?.data?.fonts || fontsData?.fonts || [];

  if (!isNew && isLoading) {
    return <div style={{ padding: 24 }}>{t("loading") || "..."}</div>;
  }

  // Quick-and-functional preview: build a sample data map from each
  // field's defaultValue (or labelEn if blank) so the canvas shows
  // something meaningful.
  const sampleData = useMemo(() => {
    const map = {};
    (formValues.fields || []).forEach((f) => {
      map[f.key] = f.defaultValue ?? f.labelEn ?? f.key;
    });
    return map;
  }, [formValues.fields]);

  const previewTemplate = {
    imageUrl: formValues.imageUrl,
    naturalWidth: formValues.naturalWidth,
    naturalHeight: formValues.naturalHeight,
    fields: formValues.fields,
    overlays: formValues.overlays,
    decorations: formValues.decorations,
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            {isNew ? t("templates.editor.titleNew") || "قالب جديد" : t("templates.editor.titleEdit") || "تعديل القالب"}
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              type="button"
              title={t("cancel") || "إلغاء"}
              onClick={() => router.push(`/${lang}/admin-dash/templates`)}
            />
            <Button
              variant="primary"
              type="submit"
              disabled={create.isPending || update.isPending}
              title={
                create.isPending || update.isPending
                  ? t("saving") || "جاري الحفظ..."
                  : t("save") || "حفظ"
              }
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16, padding: 16, alignItems: "start" }}>
          {/* Left pane: preview */}
          <div style={{ position: "sticky", top: 16 }}>
            {!formValues.imageUrl ? (
              <div
                style={{
                  border: "2px dashed #ccc",
                  borderRadius: 12,
                  padding: 48,
                  textAlign: "center",
                  background: "#fafafa",
                }}
              >
                <p>{t("templates.editor.uploadPrompt") || "ارفع صورة الخلفية أولاً"}</p>
                <Button
                  type="button"
                  variant="primary"
                  title={uploading ? "..." : t("templates.editor.uploadBtn") || "اختر صورة"}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </div>
            ) : (
              <div>
                <TemplatePreviewCanvas template={previewTemplate} data={sampleData} />
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <small style={{ color: "#666" }}>
                    {formValues.naturalWidth}×{formValues.naturalHeight}
                  </small>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: "transparent", border: "none", color: "#c28e5c", cursor: "pointer" }}
                  >
                    {t("templates.editor.changeImage") || "تغيير الصورة"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right pane: config */}
          <FieldConfigPanel
            categories={categories}
            fonts={fonts}
            fieldTypes={FIELD_TYPES}
            lang={lang}
          />
        </div>
      </form>
    </FormProvider>
  );
}
