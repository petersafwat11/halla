"use client";
import React, { useCallback, useState, useRef } from "react";
import styles from "./uploadFile.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";

const UploadFileStandalone = ({
  value = [],
  onChange,
  placeholder,
  multiple = false,
  acceptImages = false,
  existingImages = [],
}) => {
  const { t } = useTranslation("common");
  const [files, setFiles] = useState(value || []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  const acceptedImageTypes = ["image/jpeg", "image/jpg", "image/png"];
  const acceptedExtensions = "JPEG, PNG";

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
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          multiple={multiple}
          accept={acceptImages ? "image/jpeg,image/jpg,image/png" : undefined}
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

            return (
              <div key={index} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  {isImage ? (
                    <Image
                      src={getImageUrl(file)}
                      alt={typeof file === "string" ? "image" : file.name}
                      width={48}
                      height={48}
                      className={styles.filePreview}
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
                {!isExisting && (
                  <div className={styles.fileActions}>
                    <button
                      type="button"
                      onClick={() => removeFile(fileIndex)}
                      className={styles.deleteButton}
                    >
                      <Image
                        src="/svg/auth/trash.svg"
                        width={24}
                        height={24}
                        alt="delete"
                      />
                      <span className={styles.delete}>
                        {t("uploadFile.delete", "حذف")}
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
