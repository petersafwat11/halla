"use client";
import React from "react";
import Link from "next/link";
import styles from "./ErrorDisplay.module.css";

/**
 * ErrorDisplay Component
 *
 * Displays validation errors with appropriate styling and actions
 * Supports different error types: duplicate, limit, validation
 *
 * @param {Object} props
 * @param {string} props.error - Error message to display
 * @param {string} props.type - Error type: 'duplicate', 'limit', 'validation', 'general'
 * @param {string} props.field - Field that caused the error (email, mobile, etc.)
 * @param {string} props.actionLink - Optional link for action button
 * @param {string} props.actionText - Text for action button
 * @param {Function} props.onAction - Optional callback for action button
 * @param {string} props.className - Additional CSS classes
 */
const ErrorDisplay = ({
  error,
  type = "general",
  field = null,
  actionLink = null,
  actionText = null,
  onAction = null,
  className = "",
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    switch (type) {
      case "duplicate":
        return (
          <svg
            className={styles.icon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"
              fill="currentColor"
            />
          </svg>
        );
      case "limit":
        return (
          <svg
            className={styles.icon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z"
              fill="currentColor"
            />
          </svg>
        );
      default:
        return (
          <svg
            className={styles.icon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"
              fill="currentColor"
            />
          </svg>
        );
    }
  };

  const getErrorClass = () => {
    switch (type) {
      case "duplicate":
        return styles.error_duplicate;
      case "limit":
        return styles.error_limit;
      case "validation":
        return styles.error_validation;
      default:
        return styles.error_general;
    }
  };

  return (
    <div
      className={`${styles.error_container} ${getErrorClass()} ${className}`}
    >
      <div className={styles.error_content}>
        <div className={styles.error_icon}>{getErrorIcon()}</div>
        <div className={styles.error_text}>
          <p className={styles.error_message}>{error}</p>
          {(actionLink || onAction) && actionText && (
            <div className={styles.error_action}>
              {actionLink ? (
                <Link href={actionLink} className={styles.action_link}>
                  {actionText}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onAction}
                  className={styles.action_button}
                >
                  {actionText}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
