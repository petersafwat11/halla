"use client";
import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { get, useController, useFormContext } from "react-hook-form";
import styles from "./uploadFile.module.css";
import AuthIcon from "../../icons/AuthIcon";
import { useTranslation } from "react-i18next";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const UploadFile = ({
  name,
  placeholder,
  multiple = false,
  acceptImages = true,
  acceptDocuments = false,
  acceptOfficeDocuments = false,
  maxFiles = 10,
  onFileChange,
}) => {
  const { t } = useTranslation("common");
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();

  const {
    field: { value: rawFiles = [] },
  } = useController({
    name,
    control,
    defaultValue: multiple ? [] : null,
  });

  const files = useMemo(() => {
    if (!rawFiles) return [];
    if (Array.isArray(rawFiles)) return rawFiles;
    return [rawFiles];
  }, [rawFiles]);

  const fieldError = get(errors, name);
  // Array items have errors at field.0, field.1, etc., not field.message.
  const error = fieldError?.message || fieldError?.root?.message ||
    (Array.isArray(fieldError) ? fieldError.find((item) => item?.message)?.message : undefined);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  // Maintain and revoke Object URLs safely
  const [previewUrls, setPreviewUrls] = useState({});

  useEffect(() => {
    const newUrls = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file instanceof File && file.type?.startsWith("image/")) {
        newUrls[i] = URL.createObjectURL(file);
      }
    }
    setPreviewUrls(newUrls);

    return () => {
      Object.values(newUrls).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
    };
  }, [files]);

  // Build accepted MIME types and extensions string
  const { acceptedMimes, acceptedExtensions, acceptedExtensionsString, acceptAttribute } = useMemo(() => {
    const mimes = [];
    const exts = [];
    if (acceptImages) {
      const imageMimes = acceptDocuments
        ? ALLOWED_IMAGE_MIMES.filter((mime) => mime !== "image/webp")
        : ALLOWED_IMAGE_MIMES;
      mimes.push(...imageMimes);
      exts.push("JPG", "PNG");
      if (!acceptDocuments) exts.push("WebP");
    }
    if (acceptDocuments) {
      mimes.push("application/pdf");
      exts.push("PDF");
      if (acceptOfficeDocuments) {
        mimes.push(...ALLOWED_DOCUMENT_MIMES.filter((mime) => mime !== "application/pdf"));
        exts.push("DOC", "DOCX");
      }
    }
    return {
      acceptedMimes: mimes,
      acceptedExtensions: exts.map((ext) => ext.toLowerCase()),
      acceptedExtensionsString: exts.join(", "),
      acceptAttribute: mimes.join(","),
    };
  }, [acceptImages, acceptDocuments, acceptOfficeDocuments]);

  const validateFile = useCallback((file) => {
    if (!file) return false;
    // Reject SVG specifically if attempted
    if (file.type === "image/svg+xml" || file.name?.toLowerCase().endsWith(".svg")) {
      return { valid: false, error: t("uploadFile.errors.noSvg", { defaultValue: "SVG files are not supported" }) };
    }
    // Check MIME
    const ext = file.name?.split(".").pop()?.toLowerCase();
    const extensionAllowed = ext && (
      acceptedExtensions.includes(ext) || (ext === "jpeg" && acceptedExtensions.includes("jpg"))
    );
    const mimeAllowed = !file.type || acceptedMimes.includes(file.type);
    if (!extensionAllowed || !mimeAllowed) {
      return {
        valid: false,
        error: t("uploadFile.errors.invalidType", {
          formats: acceptedExtensionsString,
          defaultValue: `Accepted formats: ${acceptedExtensionsString}`,
        }),
      };
    }
    // Check size (10 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: t("uploadFile.errors.fileTooLarge", {
          defaultValue: "File size exceeds maximum allowed limit (10 MB)",
        }),
      };
    }
    return { valid: true };
  }, [acceptedExtensions, acceptedExtensionsString, acceptedMimes, t]);

  const handleFileChange = useCallback(
    (incomingFiles) => {
      const incomingList = Array.from(incomingFiles);
      if (incomingList.length === 0) return;

      setFileError("");

      // Validate each file
      for (const file of incomingList) {
        const validation = validateFile(file);
        if (!validation.valid) {
          setFileError(validation.error);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }

      if (multiple) {
        const total = files.length + incomingList.length;
        if (total > maxFiles) {
          setFileError(
            t("uploadFile.errors.maxFilesExceeded", {
              count: maxFiles,
              defaultValue: `Maximum ${maxFiles} files allowed`,
            })
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        const updated = [...files, ...incomingList];
        setValue(name, updated, { shouldValidate: true, shouldDirty: true });
        if (onFileChange) onFileChange(updated);
      } else {
        const singleFile = incomingList[0];
        setValue(name, singleFile, { shouldValidate: true, shouldDirty: true });
        if (onFileChange) onFileChange(singleFile);
      }

      // Reset input value so re-selecting same file fires onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files, multiple, maxFiles, name, setValue, onFileChange, validateFile, t]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      const dropped = event.dataTransfer?.files;
      if (dropped && dropped.length) {
        handleFileChange(dropped);
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
    const selected = event.target.files;
    if (selected && selected.length) {
      handleFileChange(selected);
    }
  };

  const removeFile = (index) => {
    if (multiple) {
      const updated = files.filter((_, i) => i !== index);
      setValue(name, updated, { shouldValidate: true, shouldDirty: true });
      if (onFileChange) onFileChange(updated);
    } else {
      setValue(name, null, { shouldValidate: true, shouldDirty: true });
      if (onFileChange) onFileChange(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerInput();
    }
  };

  return (
    <div className={styles.container}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        multiple={multiple}
        accept={acceptAttribute}
        className={styles.hiddenInput}
        name={name}
      />
      <button
        type="button"
        aria-label={placeholder || t("uploadFile.dragAndDrop", { defaultValue: "Click or drag files here" })}
        aria-describedby={`${name.replace(/[^a-zA-Z0-9_-]/g, "-")}-upload-help`}
        className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={triggerInput}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.placeholder}>
          <p>{placeholder || t("uploadFile.dragAndDrop", { defaultValue: "Drag & drop files or click to browse" })}</p>
          <p id={`${name.replace(/[^a-zA-Z0-9_-]/g, "-")}-upload-help`} className={styles.acceptedFormats}>
            {acceptedExtensionsString} • {t("uploadFile.maxSize", { defaultValue: "Max 10 MB per file" })}
            {multiple && ` • ${t("uploadFile.maxCount", { count: maxFiles, defaultValue: `Up to ${maxFiles} files` })}`}
          </p>
        </div>
      </button>

      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((file, index) => {
            const isImage = file?.type?.startsWith("image/") || (previewUrls[index] !== undefined);
            const fileName = file?.name || (typeof file === "string" ? file.split("/").pop() : "File");
            const fileSize = file?.size ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : "";

            return (
              <div key={index} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  {isImage && previewUrls[index] ? (
                    <img
                      src={previewUrls[index]}
                      alt={fileName}
                      className={styles.filePreview}
                    />
                  ) : (
                    <AuthIcon
                      src="/svg/auth/document.svg"
                      alt=""
                      width={48}
                      height={48}
                      className={styles.filePreview}
                    />
                  )}
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName}>{fileName}</p>
                    {fileSize && <p className={styles.fileSize}>{fileSize}</p>}
                  </div>
                </div>
                <div className={styles.fileActions}>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className={styles.deleteButton}
                    aria-label={t("uploadFile.delete", { defaultValue: "Delete file" })}
                  >
                    <AuthIcon
                      src="/svg/auth/trash.svg"
                      width={20}
                      height={20}
                      alt=""
                    />
                    <span className={styles.delete}>{t("uploadFile.delete", { defaultValue: "Delete" })}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(error || fileError) && (
        <div className={styles.error_container} role="alert" aria-live="polite">
          <p className={styles.error}>{error || fileError}</p>
        </div>
      )}
    </div>
  );
};

export default UploadFile;
