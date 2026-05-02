"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { whitelabelSubscriptionSchema } from "@/utils/schemas/adminPopupSchemas";
import { getEnterprisePlans } from "@/services/plansService";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./WhitelabelSubscriptionPopup.module.css";

export default function WhitelabelSubscriptionPopup({ whitelabel, onClose }) {
  const { t, i18n } = useTranslation("adminDashboard");
  const isArabic = i18n.language === "ar";
  const updateSubscription = useAdminWhitelabelMutation("updateSubscription");

  const [enterprisePlans, setEnterprisePlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getEnterprisePlans();
        const plans = res?.data?.plans || res?.plans || [];
        setEnterprisePlans(plans);
      } catch {
        // plans fetch failed — form can still be submitted if user types a code
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const planOptions = useMemo(() => {
    return enterprisePlans.map((p) => ({
      label: isArabic ? (p.nameAr || p.nameEn || p.code) : (p.nameEn || p.code),
      value: p.code,
    }));
  }, [enterprisePlans, isArabic]);

  const statusOptions = [
    { label: t("whitelabels.status.active",    "نشط"),    value: "active" },
    { label: t("whitelabels.status.expired",   "منتهي"),  value: "expired" },
    { label: t("whitelabels.status.cancelled", "ملغي"),   value: "cancelled" },
  ];

  const methods = useForm({
    resolver: zodResolver(whitelabelSubscriptionSchema),
    defaultValues: {
      planCode: whitelabel?.subscription?.planId?.code || whitelabel?.subscription?.planCode || "",
      status: whitelabel?.subscription?.status || "active",
    },
  });

  const onSubmit = async (data) => {
    try {
      await updateSubscription.mutateAsync({
        whitelabelId: whitelabel.id || whitelabel._id,
        ...data,
      });
      toast.success(t("whitelabels.subscriptionUpdateSuccess", "تم تحديث الاشتراك بنجاح"));
      onClose();
    } catch (error) {
      toast.error(error.message || t("whitelabels.subscriptionUpdateError", "فشل تحديث الاشتراك"));
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("whitelabels.updateSubscription", "تحديث الاشتراك")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("whitelabels.form.name", "اسم العلامة البيضاء")}</label>
              <input
                type="text"
                value={whitelabel?.username || whitelabel?.name || ""}
                disabled
                style={{ background: "#f5f5f5" }}
              />
            </div>

            {isLoadingPlans ? (
              <div className={styles.formGroup}>
                <p style={{ color: "#888", fontSize: 14 }}>
                  {isArabic ? "جاري تحميل الخطط..." : "Loading plans..."}
                </p>
              </div>
            ) : (
              <InputSelect
                label={t("whitelabels.form.plan", "الخطة")}
                placeholder={t("whitelabels.form.selectPlan", "اختر خطة")}
                name="planCode"
                options={planOptions}
                required
              />
            )}

            <InputSelect
              label={t("whitelabels.form.status", "الحالة")}
              placeholder={t("whitelabels.form.selectStatus", "اختر الحالة")}
              name="status"
              options={statusOptions}
              required
            />

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("common.cancel", "إلغاء")}
                onClick={onClose}
                disabled={updateSubscription.isPending}
              />
              <Button
                variant="primary"
                title={updateSubscription.isPending
                  ? t("common.loading", "جاري التحديث...")
                  : t("common.update", "تحديث")}
                type="submit"
                disabled={updateSubscription.isPending}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
