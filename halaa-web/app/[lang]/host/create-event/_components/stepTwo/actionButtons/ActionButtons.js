import Image from "next/image";
import React from "react";
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
              alt="Add"
              width={24}
              height={24}
            />
            <span>أضف</span>
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
                alt="Import"
                width={24}
                height={24}
              />
              <span>استيراد من Excel/CSV</span>
            </button>

            <button
              className={styles.importButton}
              onClick={onDownload}
              type="button"
            >
              <Image
                src="/svg/events/document-download.svg"
                alt="Download"
                width={24}
                height={24}
              />
              <span>تحميل قالب Excel/CSV</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <button className={styles.addButton} onClick={onEdit} type="button">
            <Image
              src="/svg/events/user-add.svg"
              alt="Edit"
              width={24}
              height={24}
            />
            <span>تعديل</span>
          </button>

          <button
            className={styles.importButton}
            onClick={onCancel}
            type="button"
          >
            <Image
              src="/svg/events/close.svg"
              alt="Cancel"
              width={24}
              height={24}
            />
            <span>إلغاء</span>
          </button>
        </>
      )}
    </div>
  );
};

export default ActionButtons;
