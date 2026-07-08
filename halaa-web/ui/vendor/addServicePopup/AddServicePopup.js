"use client";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./addServicePopup.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import UploadFile from "@/ui/commen/inputs/uploadFile/UploadFile";
import {
  addServiceSchema,
  addServiceDefaultValues,
  SERVICE_TYPES,
  PREDEFINED_TAGS,
} from "@/utils/schemas/addServiceSchema";
import { useServiceMutation } from "@/hooks/vendorServices";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { getImageUrl } from "@/utils/vendorHelpers";

const ExistingImagePreview = ({ control, existingImageUrl, t }) => {
  const newFiles = useWatch({ control, name: "image" });
  const hasNewFile = Array.isArray(newFiles) && newFiles.length > 0;
  if (!existingImageUrl || hasNewFile) return null;
  return (
    <div className={styles.existingImageWrapper}>
      <p className={styles.existingImageLabel}>
        {t("addServicePopup.imageUpload.current", "Current image")}
      </p>
      <img
        src={existingImageUrl}
        alt={t("addServicePopup.imageUpload.label")}
        className={styles.existingImagePreview}
      />
    </div>
  );
};

const AddServicePopup = ({ onClose, onSuccess, editingService = null }) => {
  const { t } = useTranslation("vendorServices");
  const isEditing = !!editingService;
  const [selectedTags, setSelectedTags] = useState([]);
  const [included, setIncluded] = useState([]);
  const [includedInput, setIncludedInput] = useState("");

  const createServiceMutation = useServiceMutation("createService");
  const updateServiceMutation = useServiceMutation("updateService");
  const isPending =
    createServiceMutation.isPending || updateServiceMutation.isPending;

  const methods = useForm({
    mode: "onChange",
    resolver: zodResolver(addServiceSchema(t)),
    defaultValues: addServiceDefaultValues,
  });

  const { handleSubmit, reset, control } = methods;

  const existingImageUrl = isEditing
    ? getImageUrl(editingService?._raw?.image || editingService?.image)
    : null;

  useEffect(() => {
    if (editingService?._raw) {
      reset({
        serviceName: editingService.title || editingService.name || "",
        serviceNameAr: editingService._raw.nameAr || "",
        serviceType: editingService._raw.serviceType || editingService.category || "",
        description: editingService._raw.description || "",
        descriptionAr: editingService._raw.descriptionAr || "",
        price:
          editingService._raw.price != null ? String(editingService._raw.price) : "",
        image: undefined,
      });
      setSelectedTags(
        (editingService._raw.tags || []).map((value) => {
          const match = PREDEFINED_TAGS.find((p) => p.value === value);
          return match || { value, labelKey: "", labelAr: value };
        })
      );
      setIncluded(editingService._raw.included || []);
      setIncludedInput("");
    } else {
      reset(addServiceDefaultValues);
      setSelectedTags([]);
      setIncluded([]);
      setIncludedInput("");
    }
  }, [editingService, reset]);

  const serviceTypeOptions = SERVICE_TYPES.map((type) => ({
    label: t(type.labelKey, type.labelAr),
    value: type.value,
  }));

  const predefinedTags = PREDEFINED_TAGS.map((tag) => ({
    label: t(tag.labelKey, tag.labelAr),
    value: tag.value,
  }));

  const handleTagClick = (tag) => {
    setSelectedTags((prev) =>
      prev.find((t) => t.value === tag.value)
        ? prev.filter((t) => t.value !== tag.value)
        : [...prev, tag]
    );
  };

  const getTagsDisplayText = () =>
    selectedTags.length === 0 ? "" : selectedTags.map((tag) => tag.label).join("، ");

  const handleAddIncluded = () => {
    const value = includedInput.trim();
    if (!value) return;
    if (included.includes(value)) {
      setIncludedInput("");
      return;
    }
    setIncluded((prev) => [...prev, value]);
    setIncludedInput("");
  };

  const handleRemoveIncluded = (item) => {
    setIncluded((prev) => prev.filter((i) => i !== item));
  };

  const handleIncludedKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddIncluded();
    }
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("name", data.serviceName);
    if (data.serviceNameAr?.trim()) formData.append("nameAr", data.serviceNameAr.trim());
    formData.append("category", data.serviceType);
    formData.append("description", data.description);
    if (data.descriptionAr?.trim()) formData.append("descriptionAr", data.descriptionAr.trim());
    formData.append("price", String(data.price));
    formData.append("tags", JSON.stringify(selectedTags.map((t) => t.value)));
    formData.append("included", JSON.stringify(included));

    if (data.image && data.image.length > 0) {
      formData.append("image", data.image[0]);
    }

    try {
      if (isEditing) {
        await updateServiceMutation.mutateAsync({
          serviceId: editingService.id,
          data: formData,
        });
        toastUtils.success(t("success.updated"));
      } else {
        await createServiceMutation.mutateAsync(formData);
        toastUtils.success(t("addServicePopup.success"));
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      handleError(error, t, {
        fallbackMessage: isEditing
          ? "errors.update_failed"
          : "addServicePopup.error",
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            onClick={onClose}
            className={styles.closeButton}
            type="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M2 22L22 2" stroke="#292D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 22L2 2" stroke="#292D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <h2 className={styles.title}>
            {isEditing
              ? t("addServicePopup.editTitle")
              : t("addServicePopup.title")}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.section}>
            <label className={styles.label}>
              {t("addServicePopup.imageUpload.label")}
            </label>
            <ExistingImagePreview
              control={control}
              existingImageUrl={existingImageUrl}
              t={t}
            />
            <UploadFile name="image" acceptImages={true} multiple={false} />
          </div>

          <div className={styles.row}>
            <div className={styles.inputWrapper}>
              <InputGroup label={t("addServicePopup.serviceName.label")} placeholder={t("addServicePopup.serviceName.placeholder")} name="serviceName" type="text" required />
            </div>
            <div className={styles.inputWrapper} dir="rtl">
              <InputGroup label={t("addServicePopup.serviceNameAr.label")} placeholder={t("addServicePopup.serviceNameAr.placeholder")} name="serviceNameAr" type="text" />
            </div>
          </div>

          <div className={styles.section}>
            <InputSelect
              label={t("addServicePopup.serviceType.label")}
              placeholder={t("addServicePopup.serviceType.placeholder")}
              name="serviceType"
              options={serviceTypeOptions}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.inputWrapper}>
              <InputGroup label={t("addServicePopup.description.label")} placeholder={t("addServicePopup.description.placeholder")} name="description" type="textarea" required />
            </div>
            <div className={styles.inputWrapper} dir="rtl">
              <InputGroup label={t("addServicePopup.descriptionAr.label")} placeholder={t("addServicePopup.descriptionAr.placeholder")} name="descriptionAr" type="textarea" />
            </div>
          </div>

          <div className={styles.section}>
            <InputGroup
              label={t("addServicePopup.price.label")}
              placeholder={t("addServicePopup.price.placeholder")}
              name="price"
              type="number"
              required
            />
          </div>


          <div className={styles.section}>
            <label className={styles.label}>
              {t("addServicePopup.included.label")}
            </label>

            <div className={styles.tagsInputWrapper}>
              <input
                type="text"
                className={styles.tagsInput}
                value={includedInput}
                onChange={(e) => setIncludedInput(e.target.value)}
                onKeyDown={handleIncludedKeyDown}
                placeholder={t("addServicePopup.included.placeholder")}
                style={{ cursor: "text", background: "#fff" }}
              />
            </div>

            {included.length > 0 && (
              <div className={styles.tagsContainer}>
                {included.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.tag} ${styles.tagSelected}`}
                    onClick={() => handleRemoveIncluded(item)}
                    title={t("addServicePopup.included.removeHint")}
                  >
                    {item} ✕
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <label className={styles.label}>
              {t("addServicePopup.category.label")}
            </label>

            <div className={styles.tagsInputWrapper}>
              <input
                type="text"
                className={styles.tagsInput}
                value={getTagsDisplayText()}
                placeholder={t("addServicePopup.category.placeholder")}
                readOnly
                disabled
              />
            </div>

            <div className={styles.tagsContainer}>
              {predefinedTags.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  className={`${styles.tag} ${
                    selectedTags.find((t) => t.value === tag.value)
                      ? styles.tagSelected
                      : ""
                  }`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isPending}
            >
              {isPending
                ? isEditing
                  ? t("addServicePopup.updating")
                  : t("addServicePopup.submitting")
                : isEditing
                  ? t("addServicePopup.update")
                  : t("addServicePopup.submit")}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isPending}
            >
              {t("addServicePopup.cancel")}
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
};

export default AddServicePopup;
