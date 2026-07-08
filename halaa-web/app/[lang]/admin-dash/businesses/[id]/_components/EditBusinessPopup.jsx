"use client";

import { useState } from "react";
import { useAdminBusinessMutation } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./BusinessPopup.module.css";

export default function EditBusinessPopup({ business, onClose }) {
  const { t } = useTranslation("adminBusinesses");
  const updateBusiness = useAdminBusinessMutation("update");
  const businessId = business?.id || business?._id;

  const [name, setName] = useState(business?.name || "");
  const [description, setDescription] = useState(business?.businessData?.description || "");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateBusiness.mutateAsync({ businessId, name, description });
      toastUtils.success(t("editProfile.success"));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose} size="auto">
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("editProfile.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>{t("form.name")}</label>
            <input
              type="text"
              className={styles.input}
              placeholder={t("form.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("form.description")}</label>
            <textarea
              className={styles.textarea}
              placeholder={t("form.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              title={t("common.cancel")}
              onClick={onClose}
              disabled={updateBusiness.isPending}
            />
            <Button
              variant="primary"
              title={updateBusiness.isPending ? t("common.saving") : t("common.save")}
              type="submit"
              disabled={updateBusiness.isPending}
            />
          </div>
        </form>
      </div>
    </PopupLayout>
  );
}
