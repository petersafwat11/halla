"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateSchema } from "./templateSchema";
import Button from "@/ui/commen/button/Button";
import {
  useTemplate,
  useTemplateCategories,
  useFonts,
  useCreateTemplate,
  useUpdateTemplate,
} from "@/hooks/templates";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import FieldConfigPanel from "./FieldConfigPanel";
import ImageUploadPane from "./ImageUploadPane";
import { useTemplateEditor } from "./useTemplateEditor";
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
    version: 0,
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
    version: tpl.version ?? 0,
  };
}

export default function TemplateEditorPage({ id, lang }) {
  const isNew = id === "new" || !id;
  const router = useRouter();
  const { t } = useTranslation("admin");

  const { data: tplData, isLoading, error: tplError } = useTemplate(isNew ? null : id);
  const { data: catData } = useTemplateCategories({ admin: true });
  const { data: fontsData } = useFonts();

  const create = useCreateTemplate();
  const update = useUpdateTemplate(isNew ? null : id);

  const remoteTpl = tplData?.data?.template;

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

  const { clearGuard } = useUnsavedChanges(
    formState.isDirty,
    t("templates.editor.unsavedChangesWarning")
  );

  const sampleData = useMemo(() => {
    const map = {};
    (formValues.fields || []).forEach((f) => {
      map[f.key] = f.defaultValue ?? f.labelEn ?? f.key;
    });
    return map;
  }, [formValues.fields]);

  const fileInputRef = useRef(null);

  const { uploading, handleImageChange, submit } = useTemplateEditor({
    isNew,
    id,
    lang,
    methods,
    reset,
    clearGuard,
    create,
    update,
    normalize,
    t,
  });

  const categories = catData?.data?.categories || [];
  const fonts = fontsData?.data?.fonts || [];

  if (!isNew && isLoading) return <SimpleLoading />;
  if (!isNew && tplError) {
    return (
      <div className={styles.errorState}>
        <p>{t("templates.editor.loadError", "تعذر تحميل القالب.")}</p>
        <Button
          variant="secondary"
          type="button"
          title={t("templates.editor.backToList", "العودة إلى القائمة")}
          onClick={() => router.push(`/${lang}/admin-dash/templates`)}
        />
      </div>
    );
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
      <form onSubmit={handleSubmit(submit)}>
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
