"use client";
import React, { useState } from "react";
import styles from "./personalInfoSection.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { toast } from "react-toastify";

import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import PhoneChangeOtpModal from "../PhoneChangeOtpModal/PhoneChangeOtpModal";
import { personalInfoSchema } from "@/utils/schemas/vendorSettings";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

/**
 * Personal Info — single consolidated section.
 *
 * Owns the full vendor identity edit surface: logo (businessLogo), owner full
 * name, brand name, email, phone (OTP-gated), and password change. The phone
 * field is collected by the form but committed via the separate OTP flow, not
 * by the form's submit handler.
 *
 * The store logo is a single-value image: new uploads overwrite, and the
 * inline "×" calls the shared DELETE endpoint (`field: businessLogo`, no key)
 * which wipes the value and the underlying S3 object server-side.
 */
const PersonalInfoSection = ({ data, onSave, onPhoneVerified, onRefetch }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [otpCandidate, setOtpCandidate] = useState(null);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);

  const displayData = {
    ownerFullName: data?.ownerFullName || "",
    brandName: data?.brandName || "",
    email: data?.email || "",
    phoneNumber: data?.phoneNumber || "",
    avatar: data?.avatar || null,
  };

  const handleEditClick = () => setIsPopupOpen(true);
  const handleClosePopup = () => setIsPopupOpen(false);
  const handleImageClick = (src) => setPreviewImage(src);
  const closePreview = () => setPreviewImage(null);

  const handleDeleteLogo = async () => {
    if (
      !window.confirm(
        t("personalInfo.confirmDeleteLogo", "Delete this logo?")
      )
    ) {
      return;
    }
    setIsDeletingLogo(true);
    try {
      await apiRequest({
        method: "DELETE",
        path: API_PATHS.users.deleteVendorImage,
        data: { field: "businessLogo" },
      });
      toast.success(t("messages.imageDeleted", "Image deleted"));
      if (onRefetch) onRefetch();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("messages.deleteFailed", "Failed to delete image")
      );
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const phoneChanged =
        (formData.phoneNumber || "").trim() !==
        (displayData.phoneNumber || "").trim();

      const updateData = {
        ownerFullName: formData.ownerFullName,
        brandName: formData.brandName,
        email: formData.email,
      };
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
        updateData.passwordConfirm = formData.confirmPassword;
      }
      if (formData.avatar?.files && formData.avatar.files.length > 0) {
        updateData.businessLogo = formData.avatar.files[0];
      }

      if (onSave) await onSave(updateData);

      // Close the form popup BEFORE opening the OTP modal so they don't
      // stack (the form's overlay would otherwise sit on top of the OTP
      // modal and the user would see a flash).
      setIsPopupOpen(false);
      if (phoneChanged && formData.phoneNumber) {
        setOtpCandidate(formData.phoneNumber.trim());
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setOtpCandidate(null);
    if (onPhoneVerified) onPhoneVerified();
  };

  const fileHandlers = {
    avatar: {
      onDeleteExisting: handleDeleteLogo,
      isDeletingExisting: isDeletingLogo,
    },
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            {t("personalInfo.title", "المعلومات الشخصية")}
          </div>
          <button
            type="button"
            className={styles.editButton}
            onClick={handleEditClick}
          >
            <Image
              src="/svg/vendor/edit.svg"
              alt={t("buttons.edit")}
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.logoSection}>
            <label className={styles.label}>
              {t("personalInfo.storeLogo")}
            </label>
            {displayData.avatar ? (
              <div className={styles.logoWrapper}>
                <div
                  className={styles.imagePreview}
                  onClick={() => handleImageClick(displayData.avatar)}
                >
                  <Image
                    src={displayData.avatar}
                    alt="Logo"
                    width={80}
                    height={80}
                    className={styles.thumbnailImage}
                    unoptimized
                  />
                  <span className={styles.viewText}>
                    {t("personalInfo.clickToView", "اضغط للعرض")}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.inlineDeleteBtn}
                  onClick={handleDeleteLogo}
                  disabled={isDeletingLogo}
                  aria-label={t("buttons.delete", "حذف")}
                >
                  {isDeletingLogo ? "…" : "×"}
                </button>
              </div>
            ) : (
              <div className={styles.noLogo}>
                {t("personalInfo.noLogo", "لا يوجد شعار")}
              </div>
            )}
          </div>

          <div className={styles.fieldsRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {t("personalInfo.fullName", "الاسم بالكامل")}
              </label>
              <div className={styles.inputContainer}>
                <Image
                  src="/svg/auth/profile.svg"
                  alt="profile"
                  width={24}
                  height={24}
                />
                <div className={styles.inputValue}>
                  {displayData.ownerFullName ||
                    t("personalInfo.fullNamePlaceholder")}
                </div>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {t("personalInfo.businessName", "اسم النشاط التجاري")}
              </label>
              <div className={styles.inputContainer}>
                <div className={styles.inputValue}>
                  {displayData.brandName || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.fieldsRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t("personalInfo.email")}</label>
              <div className={styles.inputContainer}>
                <Image
                  src="/svg/auth/email.svg"
                  alt="email"
                  width={24}
                  height={24}
                />
                <div className={styles.inputValue}>
                  {displayData.email || t("personalInfo.emailPlaceholder")}
                </div>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {t("personalInfo.phoneWhatsapp", "رقم الهاتف / واتساب")}
              </label>
              <div className={styles.inputContainer}>
                <div className={styles.inputValue}>
                  {displayData.phoneNumber || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PopupLayout isOpen={isPopupOpen} onClose={handleClosePopup}>
        <DynamicForm
          schema={personalInfoSchema}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={handleClosePopup}
          isLoading={isLoading}
          fileHandlers={fileHandlers}
        />
      </PopupLayout>

      <PhoneChangeOtpModal
        isOpen={!!otpCandidate}
        phoneNumber={otpCandidate}
        onClose={() => setOtpCandidate(null)}
        onSuccess={handleOtpSuccess}
      />

      {previewImage && (
        <div className={styles.modalOverlay} onClick={closePreview}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={closePreview}>
              ×
            </button>
            <Image
              src={previewImage}
              alt="Preview"
              width={600}
              height={400}
              className={styles.previewImage}
              style={{ objectFit: "contain" }}
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PersonalInfoSection;
