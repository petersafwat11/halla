"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { toast } from "react-toastify";

import styles from "./basicAccountInfo.module.css";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import PhoneChangeOtpModal from "../PhoneChangeOtpModal/PhoneChangeOtpModal";
import { basicAccountInfoSchema } from "@/utils/schemas/vendorSettings";

/**
 * Basic Account Info section.
 *
 * Phone changes go through an OTP flow: when the user submits a different
 * phone number we open the OTP modal first. The modal calls the
 * `/users/profile/phone/...` endpoints itself; once verified, this section
 * forwards the non-phone fields to the parent's `onSave` (which writes them
 * via the regular vendorData section update).
 */
const BasicAccountInfo = ({ data, onSave, onPhoneVerified }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpCandidate, setOtpCandidate] = useState(null);
  const [pendingNonPhoneSave, setPendingNonPhoneSave] = useState(null);

  const displayData = {
    ownerFullName: data?.ownerFullName || "",
    brandName: data?.brandName || "",
    email: data?.email || "",
    phoneNumber: data?.phoneNumber || "",
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const phoneChanged =
        (formData.phoneNumber || "") !== (displayData.phoneNumber || "");

      // Always save the non-phone fields immediately — they don't require
      // OTP. Phone is handled separately via the OTP modal.
      const nonPhoneFields = {
        ownerFullName: formData.ownerFullName,
        brandName: formData.brandName,
        email: formData.email,
      };
      if (onSave) await onSave(nonPhoneFields);

      if (phoneChanged) {
        setOtpCandidate(formData.phoneNumber);
      } else {
        setIsPopupOpen(false);
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setOtpCandidate(null);
    setIsPopupOpen(false);
    if (onPhoneVerified) onPhoneVerified();
    toast.success(t("messages.phoneUpdated", "Phone number updated"));
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>{t("basicAccountInfo.title")}</div>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => setIsPopupOpen(true)}
          >
            <Image
              src="/svg/vendor/edit.svg"
              alt={t("buttons.edit")}
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className={styles.fieldsRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              {t("basicAccountInfo.ownerFullName")}
            </label>
            <div className={styles.value}>
              {displayData.ownerFullName || "-"}
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              {t("basicAccountInfo.businessName")}
            </label>
            <div className={styles.value}>{displayData.brandName || "-"}</div>
          </div>
        </div>

        <div className={styles.fieldsRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              {t("basicAccountInfo.email")}
            </label>
            <div className={styles.value}>{displayData.email || "-"}</div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              {t("basicAccountInfo.phoneWhatsapp")}
            </label>
            <div className={styles.value}>{displayData.phoneNumber || "-"}</div>
          </div>
        </div>
      </div>

      <PopupLayout isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <DynamicForm
          schema={basicAccountInfoSchema}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsPopupOpen(false)}
          isLoading={isLoading}
        />
      </PopupLayout>

      <PhoneChangeOtpModal
        isOpen={!!otpCandidate}
        phoneNumber={otpCandidate}
        onClose={() => setOtpCandidate(null)}
        onSuccess={handleOtpSuccess}
      />
    </>
  );
};

export default BasicAccountInfo;
