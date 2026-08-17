"use client";
import React from "react";
import styles from "./editableSection.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";

const EditableSection = ({
  children,
  onEdit,
  isEditMode = false,
  className = "",
}) => {
  const { t } = useTranslation("vendorSettings");

  return (
    <div
      className={`${styles.container} ${
        isEditMode ? styles.editMode : ""
      } ${className}`}
    >
      {children}
      {onEdit && (
        <button
          type="button"
          className={`${styles.editButton} ${
            isEditMode ? styles.editButtonActive : ""
          }`}
          onClick={onEdit}
          aria-label={isEditMode ? t("buttons.done", "تم") : t("buttons.edit")}
        >
          {isEditMode ? (
            <span className={styles.doneText}>{t("buttons.done", "تم")}</span>
          ) : (
            <Image
              src="/svg/vendor/edit.svg"
              alt={t("buttons.edit")}
              width={24}
              height={24}
            />
          )}
        </button>
      )}
    </div>
  );
};

export default EditableSection;
