"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useAdminBusinessMutation } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddBusinessPopup.module.css";

export default function AddBusinessPopup({ onClose }) {
  const { t } = useTranslation("adminBusinesses");
  const createBusiness = useAdminBusinessMutation("create");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState(null);

  const methods = useForm({
    defaultValues: { name: "", email: "", phoneNumber: "", password: "" },
  });

  const onSubmit = async (values) => {
    try {
      const formData = new FormData();
      formData.append("name", values.name || "");
      formData.append("phoneNumber", values.phoneNumber || "");
      formData.append("email", values.email || "");
      formData.append("password", values.password || "");
      formData.append("description", description || "");
      if (logoFile) formData.append("logo", logoFile);

      await createBusiness.mutateAsync(formData);
      toastUtils.success(t("addBusiness.success"));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("addBusiness.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <InputGroup
              label={t("form.name")}
              placeholder={t("form.namePlaceholder")}
              type="text"
              name="name"
              required
            />
            <InputGroup
              label={t("form.email")}
              placeholder={t("form.emailPlaceholder")}
              type="email"
              name="email"
              required
            />
            <InputGroup
              label={t("form.phone")}
              placeholder={t("form.phonePlaceholder")}
              type="text"
              name="phoneNumber"
              required
            />
            <InputGroup
              label={t("form.password")}
              placeholder={t("form.passwordPlaceholder")}
              type="password"
              name="password"
              required
            />

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
                disabled={createBusiness.isPending}
              />
              <Button
                variant="primary"
                title={createBusiness.isPending ? t("common.saving") : t("common.add")}
                type="submit"
                disabled={createBusiness.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
