import Image from "next/image";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./actionButtons.module.css";

const ActionButtons = ({
  onDownload,
  onAddOne,
  onEdit,
  onCancel,
  fileInputRef,
  isEditing,
  isAddDisabled = false,
}) => {
  const { t } = useTranslation("createEvent");
  const handleUploadClick = () => {
    if (isAddDisabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.actionButtons}>
      {!isEditing ? (
        <>
          <button
            className={`${styles.addButton} ${
              isAddDisabled ? styles.disabled : ""
            }`}
            onClick={onAddOne}
            type="button"
            disabled={isAddDisabled}
          >
            <Image
              src="/svg/events/user-add.svg"
              alt=""
              width={24}
              height={24}
            />
            <span>{t("add")}</span>
          </button>

          <div className={styles.importButtons}>
            <button
              className={`${styles.importButton} ${
                isAddDisabled ? styles.disabled : ""
              }`}
              onClick={handleUploadClick}
              type="button"
              disabled={isAddDisabled}
            >
              <Image
                src="/svg/events/document-upload.svg"
                alt=""
                width={24}
                height={24}
              />
              <span>{t("import_spreadsheet")}</span>
            </button>

            <button
              className={styles.importButton}
              onClick={onDownload}
              type="button"
            >
              <Image
                src="/svg/events/document-download.svg"
                alt=""
                width={24}
                height={24}
              />
              <span>{t("download_spreadsheet")}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <button className={styles.addButton} onClick={onEdit} type="button">
            <Image
              src="/svg/events/user-add.svg"
              alt=""
              width={24}
              height={24}
            />
            <span>{t("edit")}</span>
          </button>

          <button
            className={styles.importButton}
            onClick={onCancel}
            type="button"
          >
            <Image
              src="/svg/events/close.svg"
              alt=""
              width={24}
              height={24}
            />
            <span>{t("cancel")}</span>
          </button>
        </>
      )}
    </div>
  );
};

export default ActionButtons;
