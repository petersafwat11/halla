"use client";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./dynamicForm.module.css";
import { FIELD_TYPES, validateForm } from "@/utils/schemas/vendorSettings";
import UploadFileStandalone from "@/ui/commen/inputs/uploadFile/UploadFileStandalone";
import {
  FaGlobe,
  FaInstagram,
  FaFacebookF,
  FaSnapchatGhost,
} from "react-icons/fa";
import { FaXTwitter, FaTiktok } from "react-icons/fa6";

const ICONS = {
  globe: FaGlobe,
  instagram: FaInstagram,
  facebook: FaFacebookF,
  twitter: FaXTwitter,
  tiktok: FaTiktok,
  snapchat: FaSnapchatGhost,
};

/**
 * DynamicForm Component
 * Renders form fields dynamically based on a schema definition
 *
 * @param {Object} props
 * @param {Object} props.schema - Schema defining the form fields
 * @param {Object} props.initialData - Initial data to populate the form
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {Function} props.onCancel - Callback when form is cancelled
 * @param {boolean} props.isLoading - Loading state for submit button
 * @param {string} props.submitLabel - Label for submit button
 * @param {string} props.cancelLabel - Label for cancel button
 */
const DynamicForm = ({
  schema,
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel,
  cancelLabel,
  fileHandlers = {},
}) => {
  const { t, i18n } = useTranslation("vendorSettings");

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [fileData, setFileData] = useState({});

  // Initialize form data from initialData
  useEffect(() => {
    if (schema?.fields) {
      const initial = {};
      schema.fields.forEach((field) => {
        initial[field.name] = initialData[field.name] ?? "";
      });
      setFormData(initial);
      setErrors({});
      setFileData({});
    }
  }, [schema, initialData]);

  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleFileChange = (fieldName, files, existingImages = []) => {
    setFileData((prev) => ({
      ...prev,
      [fieldName]: { files, existingImages },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { isValid, errors: zodErrors } = validateForm(formData, schema);
    if (!isValid) {
      setErrors(zodErrors);
      return;
    }

    // Combine validated form data with file data
    const submitData = { ...formData };
    Object.keys(fileData).forEach((key) => {
      submitData[key] = fileData[key];
    });

    onSubmit(submitData);
  };

  const getLabel = (field) => {
    return t(field.labelKey, field.labelAr);
  };

  const getPlaceholder = (field) => {
    if (field.placeholderKey) {
      return t(field.placeholderKey, field.placeholderAr);
    }
    return field.placeholderAr || "";
  };

  const renderIcon = (field) => {
    if (!field.icon) return null;
    const IconComponent = ICONS[field.icon];
    if (!IconComponent) return null;
    return (
      <span className={styles.fieldIcon}>
        <IconComponent size={16} color={field.iconColor || "#666"} />
      </span>
    );
  };

  const renderField = (field) => {
    const { name, type, required, accept, multiple } = field;
    const value = formData[name] || "";
    const error = errors[name];

    switch (type) {
      case FIELD_TYPES.FILE: {
        const existingImages = Array.isArray(initialData[name])
          ? initialData[name]
          : initialData[name]
          ? [initialData[name]]
          : [];
        const fieldHandlers = fileHandlers[name] || {};
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <UploadFileStandalone
              value={fileData[name]?.files || []}
              onChange={(files) =>
                handleFileChange(name, files, existingImages)
              }
              multiple={multiple}
              acceptImages={accept?.includes("image")}
              existingImages={existingImages}
              placeholder={getPlaceholder(field)}
              onDeleteExisting={fieldHandlers.onDeleteExisting}
              isDeletingExisting={fieldHandlers.isDeletingExisting}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );
      }

      case FIELD_TYPES.TEXTAREA:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <textarea
              className={`${styles.textarea} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={getPlaceholder(field)}
              rows={4}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );

      case FIELD_TYPES.SELECT:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <select
              className={`${styles.select} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
            >
              <option value="">{getPlaceholder(field)}</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {i18n.language === "ar"
                    ? option.labelAr
                    : t(option.labelKey, option.labelAr)}
                </option>
              ))}
            </select>
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );

      case FIELD_TYPES.URL:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {renderIcon(field)}
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <input
              type="url"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={getPlaceholder(field)}
              dir="ltr"
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );

      case FIELD_TYPES.PASSWORD:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <input
              type="password"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={getPlaceholder(field)}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );

      case FIELD_TYPES.NUMBER:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <input
              type="number"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={getPlaceholder(field)}
              min={field.validation?.min}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );

      case FIELD_TYPES.TEL:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <input
              type="tel"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder="05xxxxxxxx"
              dir="ltr"
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );

      case FIELD_TYPES.EMAIL:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <input
              type="email"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder="ahmed@gmail.com"
              dir="ltr"
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );

      // Default: text input
      default:
        return (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.label}>
              {getLabel(field)}
              {required && <span className={styles.required}>*</span>}
            </label>
            <input
              type="text"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              value={value}
              onChange={(e) => handleInputChange(name, e.target.value)}
              placeholder={getPlaceholder(field)}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>
        );
    }
  };

  if (!schema?.fields) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={onCancel} className={styles.closeButton} type="button">
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
        <h2 className={styles.title}>{t(schema.titleKey, schema.titleAr)}</h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldsContainer}>
          {schema.fields.map((field) => renderField(field))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading
              ? t("buttons.saving", "جاري الحفظ...")
              : submitLabel || t("buttons.save", "حفظ")}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel || t("buttons.cancel", "إلغاء")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DynamicForm;
