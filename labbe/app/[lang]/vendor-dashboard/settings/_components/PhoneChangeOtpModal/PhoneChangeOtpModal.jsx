"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import PopupLayout from "@/ui/commen/popup/PopupLayout";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import styles from "./phoneChangeOtpModal.module.css";

/**
 * Two-step phone change:
 *   1. Send OTP to the new phone number (auto-fired on open).
 *   2. User enters the OTP; we PATCH /users/profile/phone with the code.
 *
 * On success, calls onSuccess. The parent is responsible for refetching
 * the profile so the new phone number renders.
 */
const PhoneChangeOtpModal = ({ isOpen, phoneNumber, onClose, onSuccess }) => {
  const { t } = useTranslation("vendorSettings");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (!isOpen || !phoneNumber) return;
    let cancelled = false;
    (async () => {
      setIsSending(true);
      try {
        await apiRequest({
          method: "POST",
          path: API_PATHS.users.sendPhoneChangeOtp,
          data: { phoneNumber },
        });
        if (!cancelled) {
          setOtpSent(true);
          toast.info(
            t("messages.otpSent", "Verification code sent to your phone")
          );
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err?.response?.data?.message ||
              t("messages.otpSendFailed", "Failed to send verification code")
          );
          if (onClose) onClose();
        }
      } finally {
        if (!cancelled) setIsSending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, phoneNumber, onClose, t]);

  useEffect(() => {
    if (!isOpen) {
      setOtp("");
      setOtpSent(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsVerifying(true);
    try {
      await apiRequest({
        method: "PATCH",
        path: API_PATHS.users.updatePhone,
        data: { phoneNumber, otp: otp.trim() },
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("messages.otpVerifyFailed", "Invalid verification code")
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!phoneNumber) return;
    setIsSending(true);
    try {
      await apiRequest({
        method: "POST",
        path: API_PATHS.users.sendPhoneChangeOtp,
        data: { phoneNumber },
      });
      toast.info(t("messages.otpResent", "Verification code resent"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("messages.otpSendFailed", "Failed to send verification code")
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <PopupLayout isOpen={isOpen} onClose={onClose}>
      <form className={styles.container} onSubmit={handleSubmit}>
        <h2 className={styles.title}>
          {t("phoneOtp.title", "Verify your new phone number")}
        </h2>
        <p className={styles.subtitle}>
          {t(
            "phoneOtp.subtitle",
            "We sent a verification code to {{phone}}",
            { phone: phoneNumber }
          )}
        </p>

        <label className={styles.label}>
          {t("phoneOtp.codeLabel", "Verification code")}
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={styles.input}
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="••••••"
          maxLength={8}
          disabled={isSending || isVerifying}
        />

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSending || isVerifying || !otp.trim()}
          >
            {isVerifying
              ? t("phoneOtp.verifying", "Verifying…")
              : t("phoneOtp.verify", "Verify")}
          </button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleResend}
            disabled={isSending || isVerifying}
          >
            {isSending
              ? t("phoneOtp.sending", "Sending…")
              : t("phoneOtp.resend", "Resend code")}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isVerifying}
          >
            {t("buttons.cancel", "Cancel")}
          </button>
        </div>
      </form>
    </PopupLayout>
  );
};

export default PhoneChangeOtpModal;
