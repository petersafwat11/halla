"use client";

import { useState } from "react";
import { useAdminBusinessMutation } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./BusinessPopup.module.css";

export default function ReplaceLogoPopup({ businessId, onClose }) {
  const { t } = useTranslation("adminBusinesses");
  const updateLogo = useAdminBusinessMutation("updateLogo");
  const [logoFile, setLogoFile] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!logoFile) {
      toastUtils.warning(t("logo.noFile"));
      return;
    }
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      await updateLogo.mutateAsync({ businessId, data: formData });
      toastUtils.success(t("logo.success"));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("logo.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>{t("form.logo")}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <span className={styles.hint}>{t("form.logoHint")}</span>
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              title={t("common.cancel")}
              onClick={onClose}
              disabled={updateLogo.isPending}
            />
            <Button
              variant="primary"
              title={updateLogo.isPending ? t("common.saving") : t("common.save")}
              type="submit"
              disabled={updateLogo.isPending}
            />
          </div>
        </form>
      </div>
    </PopupLayout>
  );
}
