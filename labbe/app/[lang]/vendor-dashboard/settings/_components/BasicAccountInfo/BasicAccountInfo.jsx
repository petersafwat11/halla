"use client";
import React, { useState } from "react";
import styles from "./basicAccountInfo.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import {
  basicAccountInfoSchema,
  extractFormData,
} from "@/utils/schemas/vendorSettings";

const BasicAccountInfo = ({ data, onSave }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Use data directly as passed from parent
  const displayData = {
    ownerFullName: data?.ownerFullName || "",
    brandName: data?.brandName || "",
    email: data?.email || "",
    phoneNumber: data?.phoneNumber || "",
  };

  const handleEditClick = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave({
          ownerFullName: formData.ownerFullName,
          brandName: formData.brandName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
        });
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
          <div className={styles.title}>{t("basicAccountInfo.title")}</div>
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

      {/* Edit Popup */}
      <PopupLayout isOpen={isPopupOpen} onClose={handleClosePopup}>
        <DynamicForm
          schema={basicAccountInfoSchema}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={handleClosePopup}
          isLoading={isLoading}
        />
      </PopupLayout>
    </>
  );
};

export default BasicAccountInfo;
