"use client";

import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useAdminModeratorMutation,
  useAdminWhitelabels,
} from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { addModeratorSchema } from "@halla/shared/schemas/admin";
import useAuthStore from "@/stores/authStore";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddModeratorPopup.module.css";

// H-15: roles that REQUIRE a whitelabelId server-side. SUPER_ADMIN must
// surface a tenant picker; WHITELABEL_ADMIN inherits their own tenant
// server-side and shouldn't see the picker (the `whitelabelId` field is
// auto-populated for them by admin.controller's branch).
const ROLES_THAT_NEED_TENANT = new Set([
  "admin",
  "moderator",
  "whitelabel_admin",
  "whitelabel_moderator",
]);

export default function AddModeratorPopup({ onClose }) {
  const { t } = useTranslation("adminModerators");
  const createModerator = useAdminModeratorMutation("create");
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";
  const isWhitelabel = ["whitelabel_admin", "whitelabel_moderator"].includes(user?.role);

  // H-15: load whitelabel tenant list for the SUPER_ADMIN picker. Other
  // roles never see the picker so we skip the network call.
  const whitelabelsQuery = useAdminWhitelabels(
    {},
    { enabled: isSuperAdmin }
  );
  const whitelabelOptions = (whitelabelsQuery.data?.whitelabels || [])
    .filter((w) => w && (w._id || w.id))
    .map((w) => ({
      label: w.name || w.brandName || w.email || (w._id || w.id),
      value: w._id || w.id,
    }));

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
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      role: defaultRole,
      whitelabelId: "",
    },
  });

  // Re-render when role changes so the conditional whitelabelId field
  // shows/hides based on the currently-selected role.
  const selectedRole = useWatch({ control: methods.control, name: "role" });
  const showWhitelabelPicker =
    isSuperAdmin && ROLES_THAT_NEED_TENANT.has(selectedRole);

  const onSubmit = async (data) => {
    const phone = data.phoneNumber.startsWith("+966")
      ? data.phoneNumber
      : `+966${data.phoneNumber}`;
    // H-15: send whitelabelId only when picker is shown. For
    // WHITELABEL_ADMIN the backend auto-inherits from req.user.whitelabelId,
    // so we explicitly omit it from the payload to avoid override.
    const payload = { ...data, phoneNumber: phone };
    if (!showWhitelabelPicker) {
      delete payload.whitelabelId;
    }
    if (showWhitelabelPicker && !payload.whitelabelId) {
      toastUtils.error(t("addModerator.whitelabelRequired", "Whitelabel selection required"));
      return;
    }
    try {
      await createModerator.mutateAsync(payload);
      toastUtils.success(t("addModerator.success", "Moderator added successfully"));
      onClose();
    } catch (error) {
      handleError(error, t);
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
            {showWhitelabelPicker && (
              <InputSelect
                label={t("moderators.form.whitelabel", "العلامة البيضاء")}
                placeholder={
                  whitelabelsQuery.isLoading
                    ? t("common.loading", "جارٍ التحميل...")
                    : t("moderators.form.selectWhitelabel", "اختر العلامة البيضاء")
                }
                name="whitelabelId"
                options={whitelabelOptions}
                required
              />
            )}
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
