"use client";
import React from "react";
import Image from "next/image";
import styles from "./ImagePreviewModal.module.css";

/**
 * Reusable Image Preview Modal
 * Used across vendor settings sections for image preview functionality
 */
const ImagePreviewModal = ({ imageUrl, onClose, alt = "Preview" }) => {
  if (!imageUrl) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <Image
          src={imageUrl}
          alt={alt}
          width={600}
          height={400}
          className={styles.previewImage}
          style={{ objectFit: "contain" }}
          unoptimized={imageUrl.startsWith("http")}
        />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
