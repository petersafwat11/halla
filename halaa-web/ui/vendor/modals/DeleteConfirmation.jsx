"use client";

import React from "react";
import styles from "./DeleteConfirmation.module.css";

/**
 * Delete Confirmation Modal
 * Replaces browser's window.confirm with custom styled modal
 */
const DeleteConfirmation = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  isLoading = false,
  confirmText,
  cancelText,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h3 className={styles.title}>{title || "Confirm Delete"}</h3>

        <p className={styles.message}>
          {message || (
            <>
              Are you sure you want to delete <strong>{itemName}</strong>?
              <br />
              This action cannot be undone.
            </>
          )}
        </p>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText || "Cancel"}
          </button>
          <button
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.spinner} />
            ) : (
              confirmText || "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation;
