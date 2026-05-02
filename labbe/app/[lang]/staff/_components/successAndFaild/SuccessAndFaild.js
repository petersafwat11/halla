"use client";
import React from "react";
import styles from "./successAndFaild.module.css";

export default function SuccessAndFaild({
  isOpen,
  onClose,
  guest,
  result,
  t,
}) {
  if (!isOpen) return null;

  // Determine if this is a success or failure result
  const isSuccess = !result || result.success !== false;
  const isAlreadyCheckedIn = result?.alreadyCheckedIn;
  const errorMessage = result?.error;

  // Use the guest from the result if available (has updated status)
  const displayGuest = result?.guest || guest;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalContent}>
          <div className={styles.iconWrapper}>
            {isSuccess ? (
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.successIcon}
              >
                <path
                  d="M140 70C140 108.66 108.66 140 70 140C31.3401 140 0 108.66 0 70C0 31.3401 31.3401 0 70 0C108.66 0 140 31.3401 140 70ZM13.0068 70C13.0068 101.476 38.5235 126.993 70 126.993C101.476 126.993 126.993 101.476 126.993 70C126.993 38.5235 101.476 13.0068 70 13.0068C38.5235 13.0068 13.0068 38.5235 13.0068 70Z"
                  fill="url(#paint0_linear_success)"
                />
                <path
                  d="M61.3667 90.4588L43.8667 74.5009C42.8153 73.5421 42.8153 71.9877 43.8667 71.0289L47.6741 67.5569C48.7254 66.598 50.4302 66.598 51.4816 67.5569L63.2704 78.3068L88.5208 55.2815C89.5722 54.3228 91.277 54.3228 92.3283 55.2815L96.1357 58.7535C97.1871 59.7123 97.1871 61.2667 96.1357 62.2255L65.1742 90.4589C64.1227 91.4176 62.418 91.4176 61.3667 90.4588Z"
                  fill="#C28E5C"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_success"
                    x1="132.103"
                    y1="-12.5641"
                    x2="8.25641"
                    y2="130.667"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0.0528688" stopColor="#C28E5C" />
                    <stop offset="0.928783" stopColor="#C28E5C" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M140 70C140 108.66 108.66 140 70 140C31.3401 140 0 108.66 0 70C0 31.3401 31.3401 0 70 0C108.66 0 140 31.3401 140 70ZM13.0068 70C13.0068 101.476 38.5235 126.993 70 126.993C101.476 126.993 126.993 101.476 126.993 70C126.993 38.5235 101.476 13.0068 70 13.0068C38.5235 13.0068 13.0068 38.5235 13.0068 70Z"
                  fill="url(#paint0_linear_error)"
                />
                <path
                  d="M85 55L55 85M55 55L85 85"
                  stroke="#C0392B"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_error"
                    x1="132.103"
                    y1="-12.5641"
                    x2="8.25641"
                    y2="130.667"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0.0528688" stopColor="#C0392B" />
                    <stop offset="0.928783" stopColor="#C0392B" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </div>

          <div className={styles.description}>
            <h2 className={styles.title}>
              {isSuccess
                ? isAlreadyCheckedIn
                  ? t("alreadyCheckedIn", "تم التسجيل مسبقاً")
                  : t("confirmAttendance")
                : t("error", "حدث خطأ")}
            </h2>

            {isSuccess && displayGuest && (
              <div className={styles.guestCard}>
                <div className={styles.guestContainer}>
                  <div className={styles.guestInfo}>
                    <div className={styles.guestDetails}>
                      <div className={styles.nameSection}>
                        <h3 className={styles.guestName}>
                          {displayGuest.name}
                        </h3>
                      </div>
                      {(displayGuest.phone || displayGuest.email) && (
                        <div className={styles.contactSection}>
                          <div className={styles.contactGroup}>
                            {displayGuest.phone && (
                              <div className={styles.phoneWrapper}>
                                <span className={styles.phone}>
                                  {displayGuest.phone}
                                </span>
                              </div>
                            )}
                            {displayGuest.phone && displayGuest.email && (
                              <div className={styles.divider}>
                                <span>|</span>
                              </div>
                            )}
                          </div>
                          {displayGuest.email && (
                            <div className={styles.emailWrapper}>
                              <span className={styles.email}>
                                {displayGuest.email}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isSuccess && errorMessage && (
              <p className={styles.errorMessage}>{errorMessage}</p>
            )}
          </div>

          <div className={styles.actions}>
            <button className={styles.confirmButton} onClick={onClose}>
              {t("confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
