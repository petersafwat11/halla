"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminUploadTemplateImage } from "@/hooks/templates";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";

export function useTemplateEditor({
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
}) {
  const router = useRouter();
  const uploadImage = useAdminUploadTemplateImage();
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
      methods.setValue("naturalHeight", img.naturalHeight, {
        shouldDirty: true,
      });
    };
    img.src = localUrl;
  };

  const submit = async (data) => {
    try {
      let s3Key = data.s3Key;
      if (pendingImageFile) {
        setUploading(true);
        const result = await uploadImage.mutateAsync({
          file: pendingImageFile,
          templateId: isNew ? "new" : id,
        });
        s3Key = result.s3Key;
        setUploading(false);
      }

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
        if (!s3Key) {
          toastUtils.error(t("templates.editor.imageRequired"));
          return;
        }
        const res = await create.mutateAsync({
          ...payload,
          s3Key,
          naturalWidth: data.naturalWidth,
          naturalHeight: data.naturalHeight,
        });
        const newId = res?.data?.template?._id;
        toastUtils.success(t("templates.editor.created"));
        if (newId) {
          clearGuard();
          router.push(`/${lang}/admin-dash/templates/${newId}`);
        }
      } else {
        if (s3Key) payload.s3Key = s3Key;
        payload.expectedVersion = data.version ?? 0;
        const res = await update.mutateAsync(payload);
        toastUtils.success(t("templates.editor.saved"));
        setPendingImageFile(null);
        const updated = res?.data?.template;
        reset(updated ? normalize(updated) : { ...data }, {
          keepValues: !updated,
        });
      }
    } catch (err) {
      setUploading(false);
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 409 || code === "TEMPLATE_VERSION_CONFLICT") {
        toastUtils.error(
          t(
            "templates.editor.versionConflict",
            "Another editor saved this template. Reload and re-apply your changes."
          )
        );
        return;
      }
      handleError(err, t, { fallbackMessage: "errors.generic" });
    }
  };

  return { uploading, handleImageChange, submit };
}
