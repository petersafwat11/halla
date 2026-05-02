"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import styles from "./addServicePopup.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import UploadFile from "@/ui/commen/inputs/uploadFile/UploadFile";
import {
  addServiceSchema,
  SERVICE_TYPES,
  PREDEFINED_TAGS,
  validateAddService,
} from "@/utils/schemas/addServiceSchema";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";

const AddServicePopup = ({ onClose, onSuccess }) => {
  const { t, i18n } = useTranslation("vendorServices");
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const methods = useForm({
    mode: "onChange",
    defaultValues: addServiceSchema.defaultValues,
  });

  const {
    handleSubmit,
    formState: { errors },
  } = methods;

  // Get options from schema
  const serviceTypeOptions = SERVICE_TYPES.map((type) => ({
    label: t(type.labelKey, type.labelAr),
    value: type.value,
  }));

  // Get predefined tags from schema
  const predefinedTags = PREDEFINED_TAGS.map((tag) => ({
    label: t(tag.labelKey, tag.labelAr),
    value: tag.value,
  }));

  const handleTagClick = (tag) => {
    if (selectedTags.find((t) => t.value === tag.value)) {
      setSelectedTags(selectedTags.filter((t) => t.value !== tag.value));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    // Clear tags error when user selects a tag
    if (validationErrors.tags) {
      setValidationErrors((prev) => ({ ...prev, tags: null }));
    }
  };

  // Get display text for selected tags
  const getTagsDisplayText = () => {
    if (selectedTags.length === 0) {
      return "";
    }
    return selectedTags.map((tag) => tag.label).join("، ");
  };

  const onSubmit = async (data) => {
    // Validate using schema
    const validation = validateAddService(data);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", data.serviceName);
      formData.append("type", data.serviceType);
      formData.append("description", data.description);
      formData.append("price", data.price);
      formData.append("tags", JSON.stringify(selectedTags.map((t) => t.value)));

      // Add image if uploaded
      if (data.image && data.image.length > 0) {
        formData.append("image", data.image[0]);
      }

      const token = Cookies.get("token");
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create service");
      }

      toast.success(t("addServicePopup.success", "تم إضافة الخدمة بنجاح"));

      if (onSuccess) {
        onSuccess(result.data);
      }
      onClose();
    } catch (error) {
      console.error("Error adding service:", error);
      toast.error(
        error.message || t("addServicePopup.error", "فشل في إضافة الخدمة")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            onClick={onClose}
            className={styles.closeButton}
            type="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 22L22 2"
                stroke="#292D32"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 22L2 2"
                stroke="#292D32"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <h2 className={styles.title}>
            {t("addServicePopup.title", "إضافة خدمة جديدة")}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Image Upload Section */}
          <div className={styles.section}>
            <label className={styles.label}>
              {t("addServicePopup.imageUpload.label", "صورة الخدمة")}
            </label>
            <UploadFile name="image" acceptImages={true} multiple={false} />
          </div>

          {/* Service Name (text input) */}
          <div className={styles.section}>
            <InputGroup
              label={t("addServicePopup.serviceName.label", "اسم الخدمة")}
              placeholder={t(
                "addServicePopup.serviceName.placeholder",
                "ادخل اسم الخدمة"
              )}
              name="serviceName"
              type="text"
              required
            />
          </div>

          {/* Service Type (dropdown) */}
          <div className={styles.section}>
            <InputSelect
              label={t("addServicePopup.serviceType.label", "نوع الخدمة")}
              placeholder={t(
                "addServicePopup.serviceType.placeholder",
                "اختر نوع الخدمة"
              )}
              name="serviceType"
              options={serviceTypeOptions}
              required
            />
          </div>

          {/* Description (Required) */}
          <div className={styles.section}>
            <InputGroup
              label={t("addServicePopup.description.label", "وصف الخدمة")}
              placeholder={t(
                "addServicePopup.description.placeholder",
                "ادخل وصف الخدمة"
              )}
              name="description"
              type="textarea"
              required
            />
            {validationErrors.description && (
              <span className={styles.errorText}>
                {validationErrors.description}
              </span>
            )}
          </div>

          {/* Price Input */}
          <div className={styles.section}>
            <InputGroup
              label={t("addServicePopup.price.label", "سعر الخدمة")}
              placeholder={t(
                "addServicePopup.price.placeholder",
                "ادخل سعر الخدمة"
              )}
              name="price"
              type="number"
              required
            />
          </div>

          {/* Category with Tags - Unified Input */}
          <div className={styles.section}>
            <label className={styles.label}>
              {t("addServicePopup.category.label", "اختر التصنيف")}
            </label>

            {/* Display input showing selected tags (read-only) */}
            <div className={styles.tagsInputWrapper}>
              <input
                type="text"
                className={styles.tagsInput}
                value={getTagsDisplayText()}
                placeholder={t(
                  "addServicePopup.category.placeholder",
                  "اختر من التصنيفات أدناه"
                )}
                readOnly
                disabled
              />
            </div>

            {/* Tags selection */}
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

          {/* Action Buttons */}
          <div className={styles.footer}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading
                ? t("addServicePopup.submitting", "جاري الإنشاء...")
                : t("addServicePopup.submit", "إنشاء")}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isLoading}
            >
              {t("addServicePopup.cancel", "الغاء")}
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
};

export default AddServicePopup;
