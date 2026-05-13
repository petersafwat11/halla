"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminHostMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import { addHostSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./AddHostPopup.module.css";

export default function AddHostPopup({ onClose }) {
  const { t } = useTranslation("adminHosts");
  const createHost = useAdminHostMutation("create");

  const methods = useForm({
    resolver: zodResolver(addHostSchema),
    defaultValues: { name: "", email: "", phoneNumber: "", password: "" },
  });

  const onSubmit = async (data) => {
    try {
      await createHost.mutateAsync(data);
      toastUtils.success(t("addHost.success", "Host added successfully"));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("hosts.addHost", "إضافة عميل جديد")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <InputGroup
              label={t("hosts.form.name", "الاسم")}
              placeholder={t("hosts.form.namePlaceholder", "أدخل اسم العميل")}
              type="text"
              name="name"
              required
            />
            <InputGroup
              label={t("hosts.form.email", "البريد الإلكتروني")}
              placeholder={t("hosts.form.emailPlaceholder", "example@email.com")}
              type="email"
              name="email"
              required
            />
            <InputGroup
              label={t("hosts.form.phone", "رقم الهاتف")}
              placeholder={t("hosts.form.phonePlaceholder", "05xxxxxxxx")}
              type="text"
              name="phoneNumber"
              required
            />
            <InputGroup
              label={t("hosts.form.password", "كلمة المرور")}
              placeholder={t("hosts.form.passwordPlaceholder", "اتركه فارغاً للإنشاء التلقائي")}
              type="password"
              name="password"
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("common.cancel", "إلغاء")}
                onClick={onClose}
                disabled={createHost.isPending}
              />
              <Button
                variant="primary"
                title={createHost.isPending ? t("common.loading", "جاري الإضافة...") : t("common.add", "إضافة")}
                type="submit"
                disabled={createHost.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
