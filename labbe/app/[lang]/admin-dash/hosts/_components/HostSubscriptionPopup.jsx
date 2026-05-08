"use client";

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminHostMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useAdminPlans } from "@/hooks/reactQueryHooks/useAdmin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { hostSubscriptionSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import { getLocalized } from "@/utils/locale";
import styles from "./AddHostPopup.module.css";

const isMonthlyPlanType = (planType) =>
  typeof planType === "string"
  && (planType.endsWith("_monthly")
    || planType.endsWith("_quarterly")
    || planType.endsWith("_annual"));

export default function HostSubscriptionPopup({ host, onClose }) {
  const { t, i18n } = useTranslation("adminDashboard");
  const queryClient = useQueryClient();
  const updateSubscription = useAdminHostMutation("updateSubscription");
  const [billingCycle, setBillingCycle] = useState(
    host?.subscription?.billingCycle || "monthly",
  );

  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useAdminPlans();

  const planOptions = useMemo(() => {
    const plans = plansData?.data?.plans || [];
    return plans.map((p) => ({
      label: getLocalized(p, "name", i18n.language),
      value: p.code,
      planType: p.planType,
    }));
  }, [plansData, i18n.language]);

  const statusOptions = [
    { label: t("subscription.statusActive"),    value: "active" },
    { label: t("subscription.statusExpired"),   value: "expired" },
    { label: t("subscription.statusCancelled"), value: "cancelled" },
  ];

  const billingCycleOptions = [
    { label: t("subscription.monthly"), value: "monthly" },
    { label: t("subscription.yearly"),  value: "yearly" },
  ];

  const methods = useForm({
    resolver: zodResolver(hostSubscriptionSchema),
    defaultValues: {
      planCode: host?.subscription?.planId?.code || host?.subscription?.planType || "",
      status: host?.subscription?.status || "active",
    },
  });

  const watchedPlanCode = methods.watch("planCode");
  const selectedPlanObj = planOptions.find((p) => p.value === watchedPlanCode);
  const showBillingCycle = isMonthlyPlanType(selectedPlanObj?.planType);

  const onSubmit = async (data) => {
    try {
      await updateSubscription.mutateAsync({
        hostId: host.id,
        planCode: data.planCode,
        status: data.status,
        ...(showBillingCycle && { billingCycle }),
      });
      toastUtils.success(t("subscription.updateSuccess"));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleRetryPlans = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "plans"] });
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("subscription.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("subscription.hostName")}</label>
              <input
                type="text"
                value={host?.name || host?.username || ""}
                disabled
              />
            </div>

            {isLoadingPlans ? (
              <div className={styles.formGroup}>
                <p>{t("subscription.loadingPlans")}</p>
              </div>
            ) : plansError ? (
              <div className={styles.formGroup}>
                <p>{t("subscription.errorLoadingPlans")}</p>
                <Button
                  variant="secondary"
                  title={t("subscription.retry")}
                  onClick={handleRetryPlans}
                />
              </div>
            ) : (
              <InputSelect
                label={t("subscription.plan")}
                placeholder={t("subscription.selectPlan")}
                name="planCode"
                options={planOptions}
                required
              />
            )}

            <InputSelect
              label={t("subscription.status")}
              placeholder={t("subscription.selectStatus")}
              name="status"
              options={statusOptions}
              required
            />

            {showBillingCycle && (
              <div className={styles.formGroup}>
                <label>{t("subscription.billingCycle")}</label>
                <div className={styles.billingToggle}>
                  {billingCycleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBillingCycle(opt.value)}
                      className={`${styles.billingOption} ${billingCycle === opt.value ? styles.billingOptionActive : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  : t("subscription.update")}
                type="submit"
                disabled={updateSubscription.isPending || isLoadingPlans || !!plansError}
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </PopupLayout>
  );
}
