"use client";

import { useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useEnterprisePlans } from "@/hooks/reactQueryHooks/usePlans";
import { useTranslation } from "react-i18next";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { whitelabelSubscriptionSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./WhitelabelSubscriptionPopup.module.css";

export default function WhitelabelSubscriptionPopup({ whitelabel, onClose }) {
  const { t, i18n } = useTranslation("adminWhitelabels");
  const isArabic = i18n.language === "ar";
  const updateSubscription = useAdminWhitelabelMutation("updateSubscription");

  const { data: plansData, isLoading: isLoadingPlans } = useEnterprisePlans();

  const planOptions = useMemo(() => {
    const plans = plansData?.data?.plans || plansData?.plans || [];
    return plans.map((p) => ({
      label: isArabic ? (p.nameAr || p.nameEn || p.code) : (p.nameEn || p.code),
      value: p.code,
    }));
  }, [plansData, isArabic]);

  const statusOptions = [
    { label: t("status.active"),    value: "active" },
    { label: t("subscription.inactive"),   value: "expired" },
    { label: t("status.suspended"), value: "cancelled" },
  ];

  const methods = useForm({
    resolver: zodResolver(whitelabelSubscriptionSchema),
    defaultValues: {
      planCode: whitelabel?.subscription?.planId?.code || whitelabel?.subscription?.planCode || "",
      status: whitelabel?.subscription?.status || "active",
    },
  });

  const onSubmit = useCallback(async (data) => {
    try {
      await updateSubscription.mutateAsync({
        whitelabelId: whitelabel.id || whitelabel._id,
        ...data,
      });
      toastUtils.success(t("subscription.subscriptionUpdateSuccess"));
      onClose();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "subscription.subscriptionUpdateError" });
    }
  }, [updateSubscription, whitelabel, t, onClose]);

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("subscription.manageTitle")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("form.name")}</label>
              <input
                type="text"
                value={whitelabel?.username || whitelabel?.name || ""}
                disabled
                className={styles.disabledInput}
              />
            </div>

            {isLoadingPlans ? (
              <SimpleLoading />
            ) : (
              <InputSelect
                label={t("form.plan")}
                placeholder={t("form.selectPlan")}
                name="planCode"
                options={planOptions}
                required
              />
            )}

            <InputSelect
              label={t("form.status")}
              placeholder={t("form.selectStatus")}
              name="status"
              options={statusOptions}
              required
            />

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("subscription.cancel")}
                onClick={onClose}
                disabled={updateSubscription.isPending}
              />
              <Button
                variant="primary"
                title={updateSubscription.isPending
                  ? t("subscription.updating")
                  : t("subscription.updatePlan")}
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
