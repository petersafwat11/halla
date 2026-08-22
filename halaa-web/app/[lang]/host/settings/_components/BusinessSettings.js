"use client";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import Button from "@/ui/commen/button/Button";
import { useUserMutation } from "@/hooks/users";
import { toastUtils } from "@/utils/toastUtils";
import styles from "./BusinessSettings.module.css";

/**
 * Business-account settings: edit the public description
 * (profile.businessData.description) and the logo (top-level avatar).
 *
 * Both are sent in a single PATCH /users/profile request — the backend
 * `updateMyProfile` writes `description` to `profile.businessData.description`
 * for business accounts and stores the uploaded `avatar` file as the logo.
 * The shared `updateProfile` mutation auto-detects FormData and invalidates
 * the profile query on success.
 */
const BusinessSettings = ({ user = {} }) => {
  const { t } = useTranslation("settings");
  const fileInputRef = useRef(null);

  // `toPublicJSON` surfaces businessData at the top level (profile is dropped),
  // so read from user.businessData (with a profile fallback for safety).
  const initialDescription =
    user?.businessData?.description ??
    user?.profile?.businessData?.description ??
    "";
  const [description, setDescription] = useState(initialDescription);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(user?.avatar || null);

  React.useEffect(() => {
    setDescription(initialDescription);
    setLogoPreview(user?.avatar || null);
    setLogoFile(null);
  }, [initialDescription, user?.avatar]);

  const updateProfileMutation = useUserMutation("updateProfile");
  const isSaving = updateProfileMutation.isPending;

  const isDirty = description !== initialDescription || logoFile !== null;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("description", description);
      if (logoFile) {
        formData.append("avatar", logoFile);
      }

      const response = await updateProfileMutation.mutateAsync(formData);
      if (response.status === "success") {
        toastUtils.success(
          response.message || t("business.updatedSuccessfully")
        );
        setLogoFile(null);
      }
    } catch (error) {
      toastUtils.error(error.message || t("business.updateFailed"));
    }
  };

  const handleReset = () => {
    setDescription(initialDescription);
    setLogoFile(null);
    setLogoPreview(user?.avatar || null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <div className={styles.logoSection}>
        <span className={styles.label}>{t("business.logo")}</span>
        <div className={styles.logoRow}>
          <div className={styles.logoPreview}>
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt={t("business.logo")}
                width={96}
                height={96}
                className={styles.logoImage}
                unoptimized
              />
            ) : (
              <span className={styles.logoPlaceholder}>
                {t("business.noLogo")}
              </span>
            )}
          </div>
          <div className={styles.logoActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className={styles.fileInput}
              id="business-logo-input"
            />
            <Button
              type="button"
              variant="secondary"
              title={t("business.changeLogo")}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        </div>
      </div>

      <TextArea
        name="description"
        label={t("business.description")}
        placeholder={t("business.descriptionPlaceholder")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={6}
      />

      <div className={styles.buttonsContainer}>
        <Button
          type="submit"
          variant="primary"
          title={isSaving ? t("saving") : t("save_changes")}
          disabled={!isDirty || isSaving}
          className={styles.saveButton}
        />
        <Button
          type="button"
          variant="outline"
          title={t("cancel")}
          onClick={handleReset}
        />
      </div>
    </form>
  );
};

export default BusinessSettings;
