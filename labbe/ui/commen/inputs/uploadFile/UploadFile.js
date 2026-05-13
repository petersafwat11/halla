import React, { useCallback, useState, useRef } from "react";
import { get, useController, useFormContext } from "react-hook-form";
import styles from "./uploadFile.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";

const UploadFile = ({
  name,
  placeholder,
  multiple = false,
  acceptImages = false,
  onFileChange,
}) => {
  const { t } = useTranslation("common");
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();
  const {
    field: { value: files = [] },
  } = useController({
    name,
    control,
    defaultValue: [],
  });

  const error = get(errors, name)?.message;
  console.log("error,,,,", error);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState("");

  const fileInputRef = useRef(null);

  // Accepted image formats
  const acceptedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  const acceptedExtensions = "JPEG, PNG, GIF, WebP";

  const handleFileChange = useCallback(
    (newFiles) => {
      const newFilesArray = Array.from(newFiles);

      // Validate file types if acceptImages is true
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

      if (multiple) {
        const updatedFiles = [...(files || []), ...newFilesArray];
        setValue(name, updatedFiles, { shouldValidate: true });
      } else {
        setValue(name, newFilesArray.slice(0, 1), { shouldValidate: true });
        // Call onFileChange callback with the single file
        if (onFileChange && newFilesArray.length > 0) {
          onFileChange(newFilesArray[0]);
        }
      }
    },
    [
      files,
      multiple,
      name,
      setValue,
      acceptImages,
      acceptedImageTypes,
      acceptedExtensions,
      onFileChange,
    ]
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
    setValue(name, updatedFiles, { shouldValidate: true });
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

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
          accept={acceptImages ? "image/jpeg,image/jpg,image/png,image/gif,image/webp" : undefined}
          style={{ display: "none" }}
          name={name}
        />
        <div className={styles.placeholder}>
          <p>{t("uploadFile.dragAndDrop")}</p>
          {acceptImages && (
            <p className={styles.acceptedFormats}>
              {t("uploadFile.acceptedFormats")}: {acceptedExtensions}
            </p>
          )}
        </div>
      </div>
      {files && files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((file, index) => (
            <div key={index} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                {file.type.startsWith("image/") ? (
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
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
                  <p className={styles.fileName}>{file.name}</p>
                  <p className={styles.fileSize}>
                    {(file.size / 1024).toFixed(2)} {t("uploadFile.kb")}
                  </p>
                  <p className={styles.fileName}>
                    {t("uploadFile.clickToView")}
                  </p>
                </div>
              </div>
              <div className={styles.fileActions}>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className={styles.deleteButton}
                >
                  <Image
                    src="/svg/auth/trash.svg"
                    width={24}
                    height={24}
                    alt="delete"
                  />
                  <span className={styles.delete}>
                    {t("uploadFile.delete")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={triggerInput}
                  className={styles.deleteButton}
                >
                  <Image
                    src="/svg/auth/repeat.svg"
                    width={24}
                    height={24}
                    alt="replace"
                  />
                  <span>{t("uploadFile.replace")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className={styles.error_container}>
          <p className={styles.error}>{error}</p>
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

export default UploadFile;
