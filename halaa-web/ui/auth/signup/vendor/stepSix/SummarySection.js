"use client";
import React, { useState, useEffect, useMemo } from "react";
import AuthIcon from "@/ui/commen/icons/AuthIcon";
import SectionTitle from "@/ui/commen/title/SectionTitle";
import styles from "./stepSix.module.css";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa6";

const FileItemPreview = ({ file, label }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  const isImage = useMemo(() => {
    if (!file) return false;
    if (file instanceof File) {
      return (
        file.type?.startsWith("image/") &&
        !file.name?.toLowerCase().endsWith(".svg")
      );
    }
    if (typeof file === "string") {
      return /\.(jpe?g|png|webp)(\?.*)?$/i.test(file);
    }
    return false;
  }, [file]);

  useEffect(() => {
    if (file instanceof File && isImage) {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      return () => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      };
    }
  }, [file, isImage]);

  const fileName =
    file?.name ||
    (typeof file === "string" ? file.split("/").pop() : label || "file");
  const fileSize = file?.size
    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    : null;

  if (isImage && objectUrl) {
    return (
      <img src={objectUrl} alt={fileName} className={styles.logo_preview} />
    );
  }

  return (
    <div className={styles.fileCard}>
      <AuthIcon
        src="/svg/auth/document.svg"
        alt="document"
        width={24}
        height={24}
      />
      <div className={styles.fileDetails}>
        <span className={styles.fileName} title={fileName}>
          {fileName}
        </span>
        {fileSize && <span className={styles.fileSize}>{fileSize}</span>}
      </div>
    </div>
  );
};

const SummarySection = ({
  title,
  icon,
  data,
  fields,
  onEdit,
  stepNumber,
  editLabel,
}) => {
  const { t } = useTranslation("common");

  if (!data) {
    return null;
  }

  const hasContent = fields.some((field) => {
    const value = field.key
      .split(".")
      .reduce((o, i) => (o ? o[i] : undefined), data);
    return (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    );
  });

  if (!hasContent) {
    return null;
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <SectionTitle title={title} icon={icon} height={24} width={24} />
        {onEdit && stepNumber && (
          <button
            type="button"
            onClick={() => onEdit(stepNumber)}
            className={styles.editBtn}
            aria-label={`${t("actions.edit", { defaultValue: "Edit" })} ${title}`}
          >
            <FaPen size={12} />
            <span>
              {editLabel || t("actions.edit", { defaultValue: "تعديل" })}
            </span>
          </button>
        )}
      </div>

      <div className={styles.summaryGrid}>
        {fields.map((field) => {
          const fieldValue = field.key
            .split(".")
            .reduce((o, i) => (o ? o[i] : undefined), data);

          if (
            fieldValue === undefined ||
            fieldValue === null ||
            (typeof fieldValue === "string" && fieldValue.trim() === "") ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
          ) {
            return null;
          }

          let content = null;

          if (
            field.type === "file" ||
            field.type === "logo" ||
            field.type === "document"
          ) {
            const fileList = Array.isArray(fieldValue)
              ? fieldValue
              : [fieldValue];
            content = (
              <div className={styles.fileList}>
                {fileList.map((file, idx) => (
                  <FileItemPreview
                    key={idx}
                    file={file}
                    label={field.label}
                  />
                ))}
              </div>
            );
          } else if (
            field.type === "tags" ||
            (Array.isArray(fieldValue) && !field.options)
          ) {
            content = (
              <div className={styles.badgeList}>
                {fieldValue.map((item, idx) => (
                  <span key={idx} className={styles.badge}>
                    {typeof item === "string"
                      ? item
                      : item?.nameAr || item?.name || String(item)}
                  </span>
                ))}
              </div>
            );
          } else if (Array.isArray(fieldValue)) {
            let displayValue = fieldValue;
            if (field.options) {
              displayValue = fieldValue
                .map((val) => {
                  const opt = field.options.find((o) => o.value === val);
                  return opt ? opt.label : val;
                })
                .join(", ");
            } else {
              displayValue = fieldValue
                .map((item) => item.label || item)
                .join(", ");
            }
            content = <span>{displayValue}</span>;
          } else {
            content = <span>{fieldValue}</span>;
          }

          return (
            <div key={field.key} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{field.label}</span>
              <div className={styles.summaryValue}>{content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SummarySection;
