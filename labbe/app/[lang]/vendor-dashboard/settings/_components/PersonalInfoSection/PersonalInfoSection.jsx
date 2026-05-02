"use client";
import React, { useState } from "react";
import styles from "./personalInfoSection.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import { personalInfoSchema } from "@/utils/schemas/vendorSettings";

const PersonalInfoSection = ({ data, onSave }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Extract display data
  const displayData = {
    name: data?.name || "",
    email: data?.email || "",
    avatar: data?.avatar || null,
  };

  const handleEditClick = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleImageClick = (imageSrc) => {
    setPreviewImage(imageSrc);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      if (onSave) {
        const updateData = {
          name: formData.name,
          email: formData.email,
        };
        // Only include password if provided
        if (formData.newPassword) {
          updateData.newPassword = formData.newPassword;
        }
        // Handle avatar file upload
        if (formData.avatar?.files && formData.avatar.files.length > 0) {
          updateData.businessLogo = formData.avatar.files[0];
        }
        await onSave(updateData);
      }
      setIsPopupOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
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
          {/* Logo Display */}
          <div className={styles.logoSection}>
            <label className={styles.label}>
              {t("personalInfo.storeLogo")}
            </label>
            {displayData.avatar ? (
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
                />
                <span className={styles.viewText}>
                  {t("personalInfo.clickToView", "اضغط للعرض")}
                </span>
              </div>
            ) : (
              <div className={styles.noLogo}>
                {t("personalInfo.noLogo", "لا يوجد شعار")}
              </div>
            )}
          </div>

          {/* Full Name */}
          <div className={styles.fieldsRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {t("personalInfo.fullName")}
              </label>
              <div className={styles.inputContainer}>
                <Image
                  src="/svg/auth/profile.svg"
                  alt="profile"
                  width={24}
                  height={24}
                />
                <div className={styles.inputValue}>
                  {displayData.name || t("personalInfo.fullNamePlaceholder")}
                </div>
              </div>
            </div>
          </div>

          {/* Email */}
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
          </div>
        </div>
      </div>

      {/* Edit Popup */}
      <PopupLayout isOpen={isPopupOpen} onClose={handleClosePopup}>
        <DynamicForm
          schema={personalInfoSchema}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={handleClosePopup}
          isLoading={isLoading}
        />
      </PopupLayout>

      {/* Image Preview Modal */}
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
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PersonalInfoSection;
