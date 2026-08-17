"use client";
import React, { useCallback, useState, useRef } from "react";
import styles from "./uploadFile.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";

/**
 * UploadFileStandalone
 *
 * Generic file picker used across vendor settings dynamic forms.
 *
 * Image-handling contract (matches mobile + ImagesAndPricingEditForm):
 *  - `existingImages`: server-side images already saved. Each tile gets an
 *     "×" delete button ONLY when the parent supplies `onDeleteExisting`,
 *     so the parent can fire the DELETE endpoint and refetch.
 *  - `value` / `onChange`: new files picked locally. Each tile shows a
 *     local "remove" button that just unstages the file from `value`.
 *
 * The dropzone is also a button: clicking opens the native picker. We
 * render a visible "+ Add image" affordance so users see it as an action,
 * not as decorative copy.
 */
const UploadFileStandalone = ({
  value = [],
  onChange,
  placeholder,
  multiple = false,
  acceptImages = false,
  existingImages = [],
  onDeleteExisting,
  isDeletingExisting = false,
}) => {
  const { t } = useTranslation("common");
  const [files, setFiles] = useState(value || []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  const acceptedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  const acceptedExtensions = "JPEG, PNG, GIF, WebP";

  const handleFileChange = useCallback(
    (newFiles) => {
      const newFilesArray = Array.from(newFiles);

      if (acceptImages) {
        const invalidFiles = newFilesArray.filter(
          (file) => !acceptedImageTypes.includes(file.type)
        );

        if (invalidFiles.length > 0) {
          setFileError(`Only ${acceptedExtensions} files are accepted`);
          return;
        }
      }

      setFileError("");

      let updatedFiles;
      if (multiple) {
        updatedFiles = [...files, ...newFilesArray];
      } else {
        updatedFiles = newFilesArray.slice(0, 1);
      }

      setFiles(updatedFiles);
      if (onChange) {
        onChange(updatedFiles);
      }
    },
    [files, multiple, acceptImages, onChange]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      const droppedFiles = event.dataTransfer.files;
      if (droppedFiles.length) {
        handleFileChange(droppedFiles);
      }
    },
    [handleFileChange]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleInputChange = (event) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length) {
      handleFileChange(selectedFiles);
    }
    // Reset so picking the same file twice in a row still fires onChange.
    event.target.value = "";
  };

  const removeFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    if (onChange) {
      onChange(updatedFiles);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  const getImageUrl = (file) => {
    if (typeof file === "string") {
      return file;
    }
    return URL.createObjectURL(file);
  };

  const allImages = [...existingImages, ...files];

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={triggerInput}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerInput();
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          multiple={multiple}
          accept={acceptImages ? "image/jpeg,image/jpg,image/png,image/gif,image/webp" : undefined}
          style={{ display: "none" }}
        />
        <div className={styles.placeholder}>
          <p>
            {placeholder ||
              t(
                "uploadFile.dragAndDrop",
                "اسحب وأفلت الملفات هنا أو انقر للتحميل"
              )}
          </p>
          <span className={styles.addBadge}>
            + {t("uploadFile.add", "إضافة صورة")}
          </span>
          {acceptImages && (
            <p className={styles.acceptedFormats}>
              {t("uploadFile.acceptedFormats", "الصيغ المقبولة")}:{" "}
              {acceptedExtensions}
            </p>
          )}
        </div>
      </div>

      {allImages.length > 0 && (
        <div className={styles.fileList}>
          {allImages.map((file, index) => {
            const isExisting = index < existingImages.length;
            const fileIndex = isExisting
              ? index
              : index - existingImages.length;
            const isImage =
              typeof file === "string" || file?.type?.startsWith("image/");

            // Existing items are only deletable when the parent wires
            // `onDeleteExisting` — that callback must fire the DELETE
            // endpoint and trigger a refetch, since the value lives on
            // the server, not in this component's `files` state.
            const canDelete = isExisting ? !!onDeleteExisting : true;
            const handleClick = () => {
              if (isExisting) {
                onDeleteExisting?.(file);
              } else {
                removeFile(fileIndex);
              }
            };

            return (
              <div key={`${isExisting ? "existing" : "new"}-${index}`} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  {isImage ? (
                    <Image
                      src={getImageUrl(file)}
                      alt={typeof file === "string" ? "image" : file.name}
                      width={48}
                      height={48}
                      className={styles.filePreview}
                      unoptimized
                    />
                  ) : (
                    <Image
                      src="/svg/auth/document.svg"
                      alt="file icon"
                      width={48}
                      height={48}
                      className={styles.filePreview}
                    />
                  )}
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName}>
                      {typeof file === "string"
                        ? t("uploadFile.existingFile", "ملف موجود")
                        : file.name}
                    </p>
                    {typeof file !== "string" && (
                      <p className={styles.fileSize}>
                        {(file.size / 1024).toFixed(2)}{" "}
                        {t("uploadFile.kb", "كيلوبايت")}
                      </p>
                    )}
                  </div>
                </div>
                {canDelete && (
                  <div className={styles.fileActions}>
                    <button
                      type="button"
                      onClick={handleClick}
                      className={styles.deleteButton}
                      disabled={isExisting && isDeletingExisting}
                      aria-label={t("uploadFile.delete", "حذف")}
                    >
                      <Image
                        src="/svg/auth/trash.svg"
                        width={24}
                        height={24}
                        alt="delete"
                      />
                      <span className={styles.delete}>
                        {isExisting && isDeletingExisting
                          ? t("uploadFile.deleting", "...")
                          : t("uploadFile.delete", "حذف")}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {fileError && (
        <div className={styles.error_container}>
          <p className={styles.error}>{fileError}</p>
        </div>
      )}
    </div>
  );
};

export default UploadFileStandalone;
