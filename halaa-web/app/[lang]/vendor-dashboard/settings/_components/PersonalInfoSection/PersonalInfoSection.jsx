"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { toast } from "react-toastify";

import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import ImagePreviewModal from "@/ui/vendor/modals/ImagePreviewModal";
import PhoneChangeOtpModal from "../PhoneChangeOtpModal/PhoneChangeOtpModal";
import { personalInfoSchema } from "@/utils/schemas/vendorSettings";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import {
  SectionCard,
  FieldGrid,
  ReadField,
  DocThumb,
  EmptyState,
} from "../_shared/SettingsPrimitives";
import styles from "./personalInfoSection.module.css";

/**
 * Personal Info — vendor identity edit surface: logo (businessLogo), owner
 * full name, brand name, email, phone (OTP-gated), and password change.
 *
 * The phone field is collected by the form but committed via the separate
 * OTP flow (PhoneChangeOtpModal), not by the form's submit handler. The store
 * logo is single-value: new uploads overwrite, and the inline "×" calls the
 * shared DELETE endpoint (`field: businessLogo`, no key).
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

  const handleDeleteLogo = async () => {
    if (!window.confirm(t("personalInfo.confirmDeleteLogo", "Delete this logo?"))) {
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

      // Close the form popup BEFORE opening the OTP modal so they don't stack.
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
      <SectionCard
        title={t("personalInfo.title", "المعلومات الشخصية")}
        onEdit={() => setIsPopupOpen(true)}
      >
        <div className={styles.logoBlock}>
          <span className={styles.blockLabel}>{t("personalInfo.storeLogo")}</span>
          {displayData.avatar ? (
            <DocThumb
              src={displayData.avatar}
              onView={() => setPreviewImage(displayData.avatar)}
              onDelete={handleDeleteLogo}
              isDeleting={isDeletingLogo}
              viewLabel={t("personalInfo.clickToView", "اضغط للعرض")}
            />
          ) : (
            <EmptyState>{t("personalInfo.noLogo", "لا يوجد شعار")}</EmptyState>
          )}
        </div>

        <FieldGrid>
          <ReadField
            label={t("personalInfo.fullName", "الاسم بالكامل")}
            value={displayData.ownerFullName}
            placeholder={t("personalInfo.fullNamePlaceholder", "-")}
            icon={
              <Image src="/svg/auth/profile.svg" alt="" width={20} height={20} />
            }
          />
          <ReadField
            label={t("personalInfo.businessName", "اسم النشاط التجاري")}
            value={displayData.brandName}
          />
          <ReadField
            label={t("personalInfo.email")}
            value={displayData.email}
            placeholder={t("personalInfo.emailPlaceholder", "-")}
            icon={
              <Image src="/svg/auth/email.svg" alt="" width={20} height={20} />
            }
          />
          <ReadField
            label={t("personalInfo.phoneWhatsapp", "رقم الجوال / واتساب")}
            value={displayData.phoneNumber}
          />
        </FieldGrid>
      </SectionCard>

      <PopupLayout isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <DynamicForm
          schema={personalInfoSchema(t)}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsPopupOpen(false)}
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

      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
        alt={t("personalInfo.storeLogo", "Logo")}
      />
    </>
  );
};

export default PersonalInfoSection;
