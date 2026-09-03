"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminModeratorMutation } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { editModeratorSchema } from "@halaa/shared/schemas/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddModeratorPopup.module.css";

import { toE164 } from "@halaa/shared/utils/phone";

export default function EditModeratorPopup({ moderator, onClose }) {
  const { t } = useTranslation("adminModerators");
  const updateModerator = useAdminModeratorMutation("update");

  const roleOptions = [
    { label: t("moderators.roles.moderator", "مشرف"), value: "moderator" },
    { label: t("moderators.roles.admin", "مدير"), value: "admin" },
  ];

  const defaultRole = "moderator";

  const rawPhone = moderator?.phoneNumber || moderator?.phone || "";

  const methods = useForm({
    resolver: zodResolver(editModeratorSchema),
    defaultValues: {
      name: moderator?.name || "",
      email: moderator?.email || "",
      phoneNumber: rawPhone,
      role: moderator?.role || defaultRole,
    },
  });

  const onSubmit = async (formData) => {
    try {
      await updateModerator.mutateAsync({
        moderatorId: moderator.id || moderator._id,
        data: {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phoneNumber: toE164(formData.phoneNumber),
          role: formData.role,
        },
      });
      toastUtils.success(t("editModerator.success", "Moderator updated successfully"));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("moderators.editModerator", "تعديل المشرف")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <InputGroup
              label={t("moderators.form.name", "الاسم")}
              placeholder={t("moderators.form.namePlaceholder", "أدخل اسم المشرف")}
              type="text"
              name="name"
              required
            />
            <InputGroup
              label={t("moderators.form.email", "البريد الإلكتروني")}
              placeholder={t("moderators.form.emailPlaceholder", "example@email.com")}
              type="email"
              name="email"
              required
            />
            <MobileInputGroup
              label={t("moderators.form.phone", "رقم الجوال")}
              placeholder={t("moderators.form.phonePlaceholder", "05xxxxxxxx")}
              type="text"
              name="phoneNumber"
              required
            />
            <InputSelect
              label={t("moderators.form.role", "الدور")}
              placeholder={t("moderators.form.selectRole", "اختر الدور")}
              name="role"
              options={roleOptions}
              required
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("common.cancel", "إلغاء")}
                onClick={onClose}
                disabled={updateModerator.isPending}
              />
              <Button
                variant="primary"
                title={updateModerator.isPending ? t("common.loading", "جاري التحديث...") : t("common.update", "تحديث")}
                type="submit"
                disabled={updateModerator.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
