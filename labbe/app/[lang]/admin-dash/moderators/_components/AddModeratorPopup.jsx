"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminModeratorMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { addModeratorSchema } from "@/utils/schemas/adminPopupSchemas";
import useAuthStore from "@/stores/authStore";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddModeratorPopup.module.css";

export default function AddModeratorPopup({ onClose }) {
  const { t } = useTranslation("adminDashboard");
  const createModerator = useAdminModeratorMutation("create");
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

  const methods = useForm({
    resolver: zodResolver(addModeratorSchema),
    defaultValues: { name: "", email: "", phoneNumber: "", password: "", role: defaultRole },
  });

  const onSubmit = async (data) => {
    const phone = data.phoneNumber.startsWith("+966")
      ? data.phoneNumber
      : `+966${data.phoneNumber}`;
    try {
      await createModerator.mutateAsync({ ...data, phoneNumber: phone });
      toast.success(t("moderators.createSuccess", "تم إضافة المشرف بنجاح"));
      onClose();
    } catch (error) {
      toast.error(error.message || t("moderators.createError", "فشل إضافة المشرف"));
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("moderators.addModerator", "إضافة مشرف جديد")}</h2>
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
            <InputGroup
              label={t("moderators.form.password", "كلمة المرور")}
              placeholder={t("moderators.form.passwordPlaceholder", "اتركه فارغاً للإنشاء التلقائي")}
              type="password"
              name="password"
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
                disabled={createModerator.isPending}
              />
              <Button
                variant="primary"
                title={createModerator.isPending ? t("common.loading", "جاري الإضافة...") : t("common.add", "إضافة")}
                type="submit"
                disabled={createModerator.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
