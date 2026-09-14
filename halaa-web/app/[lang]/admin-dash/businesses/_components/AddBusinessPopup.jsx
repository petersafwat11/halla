"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useAdminBusinessMutation } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { applyServerFieldErrors, handleError } from "@/services/errorHandlingService";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import UploadFileStandalone from "@/ui/commen/inputs/uploadFile/UploadFileStandalone";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddBusinessPopup.module.css";

import { toE164 } from "@halaa/shared/utils/phone";

export default function AddBusinessPopup({ onClose }) {
  const { t } = useTranslation("adminBusinesses");
  const { t: tCommon } = useTranslation("common");
  const createBusiness = useAdminBusinessMutation("create");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState(null);

  const methods = useForm({
    defaultValues: { name: "", email: "", phoneNumber: "", password: "" },
  });

  // Mirrors the backend `createBusinessSchema`, so a payload the server would
  // reject never leaves the browser as an unexplained 400.
  const nameRules = {
    minLength: { value: 2, message: tCommon("validation.minLength", { count: 2 }) },
    maxLength: { value: 100, message: tCommon("validation.maxLength", { count: 100 }) },
  };
  const emailRules = {
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: tCommon("validation.invalidEmail"),
    },
  };
  const passwordRules = {
    validate: {
      // Optional field: blank means "generate one server-side".
      length: (value) => {
        const raw = (value || "").trim();
        if (!raw) return true;
        if (raw.length < 8) return tCommon("validation.passwordMinLength");
        if (raw.length > 128) return tCommon("validation.passwordMaxLength");
        return true;
      },
    },
  };

  const onSubmit = async (values) => {
    const phoneNumber = toE164(values.phoneNumber);
    if (!phoneNumber) {
      // Defensive: never post an empty `phoneNumber`, which the backend
      // rejects with a generic validation error rather than a field hint.
      methods.setError("phoneNumber", {
        type: "manual",
        message: tCommon("validation.invalidSaudiPhone"),
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", (values.name || "").trim());
      formData.append("phoneNumber", phoneNumber);
      if (values.email && values.email.trim()) {
        formData.append("email", values.email.trim().toLowerCase());
      }
      if (values.password && values.password.trim()) {
        formData.append("password", values.password.trim());
      }
      if (description && description.trim()) {
        formData.append("description", description.trim());
      }
      if (logoFile) formData.append("logo", logoFile);

      await createBusiness.mutateAsync(formData);
      toastUtils.success(t("addBusiness.success"));
      onClose();
    } catch (error) {
      // Pin the server's validation failure to the offending input instead of
      // leaving only the generic "check your data" toast.
      applyServerFieldErrors(error, methods.setError, { t: tCommon });
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose} size="auto">
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
              rules={nameRules}
            />
            <InputGroup
              label={t("form.email")}
              placeholder={t("form.emailPlaceholder")}
              type="email"
              name="email"
              required
              rules={emailRules}
            />
            <MobileInputGroup
              label={t("form.phone")}
              placeholder={t("form.phonePlaceholder")}
              type="text"
              name="phoneNumber"
              required
            />
            <InputGroup
              label={t("form.password")}
              placeholder={t("form.passwordPlaceholder", "اتركه فارغاً للإنشاء التلقائي")}
              type="password"
              name="password"
              rules={passwordRules}
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
              <UploadFileStandalone
                acceptImages
                value={logoFile ? [logoFile] : []}
                onChange={(files) => setLogoFile(files[0] || null)}
              />
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
