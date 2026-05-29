"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminModeratorMutation } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { editModeratorSchema } from "@/utils/schemas/adminPopupSchemas";
import useAuthStore from "@/stores/authStore";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddModeratorPopup.module.css";

export default function EditModeratorPopup({ moderator, onClose }) {
  const { t } = useTranslation("adminModerators");
  const updateModerator = useAdminModeratorMutation("update");
  const { user } = useAuthStore();
  const isWhitelabel = ["whitelabel_admin", "whitelabel_moderator"].includes(user?.role);

  const roleOptions = isWhitelabel
    ? [
        { label: t("moderators.roles.whitelabelModerator", "مشرف علامة بيضاء"), value: "whitelabel_moderator" },
        { label: t("moderators.roles.whitelabelAdmin", "مدير علامة بيضاء"), value: "whitelabel_admin" },
      ]
    : [
        { label: t("moderators.roles.moderator", "مشرف"), value: "moderator" },
        { label: t("moderators.roles.admin", "مدير"), value: "admin" },
      ];

  const defaultRole = isWhitelabel ? "whitelabel_moderator" : "moderator";

  const rawPhone = moderator?.phoneNumber || moderator?.phone || "";
  const displayPhone = rawPhone.replace(/^\+966/, "");

  const methods = useForm({
    resolver: zodResolver(editModeratorSchema),
    defaultValues: {
      name: moderator?.name || moderator?.username || "",
      email: moderator?.email || "",
      phoneNumber: displayPhone,
      role: moderator?.role || defaultRole,
    },
  });

  const onSubmit = async (formData) => {
    const phone = formData.phoneNumber.startsWith("+966")
      ? formData.phoneNumber
      : `+966${formData.phoneNumber}`;
    try {
      await updateModerator.mutateAsync({
        moderatorId: moderator.id || moderator._id,
        data: { ...formData, phoneNumber: phone },
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
            <InputGroup
              label={t("moderators.form.phone", "رقم الهاتف")}
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
