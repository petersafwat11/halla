"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateSchema } from "./templateSchema";
import Button from "@/ui/commen/button/Button";
import { useTemplate, useTemplateCategories, useFonts } from "@/hooks/queries/useTemplates";
import {
  useCreateTemplate,
  useUpdateTemplate,
} from "@/hooks/mutations/useTemplateMutations";
import { templatesService } from "@/services/templatesService";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import FieldConfigPanel from "./FieldConfigPanel";
import ImageUploadPane from "./ImageUploadPane";
import styles from "./TemplateEditorPage.module.css";

const FIELD_TYPES = [
  "text", "textarea", "date", "time", "color",
  "font", "number", "email", "password",
];

function makeEmptyTemplate() {
  return {
    nameEn: "", nameAr: "", categories: [], imageUrl: "", s3Key: "",
    naturalWidth: 1080, naturalHeight: 1350,
    fields: [], overlays: [], decorations: [], sortOrder: 0, active: true,
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
    resolver: zodResolver(templateSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: makeEmptyTemplate(),
  });
  const { handleSubmit, reset, watch, formState } = methods;

  const formValues = watch();

  useEffect(() => {
    if (!isNew && remoteTpl) reset(normalize(remoteTpl));
    if (isNew) reset(makeEmptyTemplate());
  }, [isNew, remoteTpl, reset]);

  const { clearGuard } = useUnsavedChanges(formState.isDirty, t("templates.editor.unsavedChangesWarning"));

  // Must be before early return to satisfy rules-of-hooks
  const sampleData = useMemo(() => {
    const map = {};
    (formValues.fields || []).forEach((f) => {
      map[f.key] = f.defaultValue ?? f.labelEn ?? f.key;
    });
    return map;
  }, [formValues.fields]);

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastUtils.error(t("templates.editor.fileTooLarge"));
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPendingImageFile(file);
    methods.setValue("imageUrl", localUrl, { shouldDirty: true });
    methods.setValue("s3Key", "", { shouldDirty: true });
    const img = new Image();
    img.onload = () => {
      methods.setValue("naturalWidth", img.naturalWidth, { shouldDirty: true });
      methods.setValue("naturalHeight", img.naturalHeight, { shouldDirty: true });
    };
    img.src = localUrl;
  };

  const onSubmit = async (data) => {
    try {
      let s3Key = data.s3Key;

      if (pendingImageFile) {
        setUploading(true);
        const result = await templatesService.adminUploadImage(pendingImageFile, {
          templateId: isNew ? "new" : id,
        });
        s3Key = result.s3Key;
        setUploading(false);
      }

      const payload = {
        nameEn: data.nameEn, nameAr: data.nameAr,
        categories: data.categories, fields: data.fields,
        overlays: data.overlays, decorations: data.decorations,
        sortOrder: data.sortOrder, active: data.active,
      };
      if (isNew) {
        if (!s3Key) {
          toastUtils.error(t("templates.editor.imageRequired"));
          return;
        }
        const res = await create.mutateAsync({
          ...payload, s3Key,
          naturalWidth: data.naturalWidth, naturalHeight: data.naturalHeight,
        });
        const newId = res?.data?.template?._id || res?.template?._id;
        toastUtils.success(t("templates.editor.created"));
        if (newId) {
          clearGuard();
          router.push(`/${lang}/admin-dash/templates/${newId}`);
        }
      } else {
        if (s3Key) payload.s3Key = s3Key;
        await update.mutateAsync(payload);
        toastUtils.success(t("templates.editor.saved"));
        setPendingImageFile(null);
        reset({ ...data }, { keepValues: true });
      }
    } catch (err) {
      setUploading(false);
      handleError(err, t, { fallbackMessage: "errors.generic" });
    }
  };

  const categories = catData?.data?.categories || catData?.categories || [];
  const fonts = fontsData?.data?.fonts || fontsData?.fonts || [];

  if (!isNew && isLoading) {
    return <SimpleLoading />;
  }

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
        <div className={styles.editorHeader}>
          <h1 className={styles.editorTitle}>
            {isNew ? t("templates.editor.titleNew") : t("templates.editor.titleEdit")}
          </h1>
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              type="button"
              title={t("cancel")}
              onClick={() => router.push(`/${lang}/admin-dash/templates`)}
            />
            <Button
              variant="primary"
              type="submit"
              disabled={create.isPending || update.isPending || uploading}
              title={
                create.isPending || update.isPending || uploading
                  ? t("saving")
                  : t("save")
              }
            />
          </div>
        </div>

        <div className={styles.editorBody}>
          <div className={styles.previewPane}>
            <ImageUploadPane
              imageUrl={formValues.imageUrl}
              naturalWidth={formValues.naturalWidth}
              naturalHeight={formValues.naturalHeight}
              onUpload={handleImageChange}
              fileInputRef={fileInputRef}
              template={previewTemplate}
              sampleData={sampleData}
            />
          </div>

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
