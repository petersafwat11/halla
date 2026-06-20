"use client";

import { useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminHostMutation, useAdminPlans, adminKeys } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { subscriptionAssignmentSchema } from "@halla/shared/schemas/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import { getLocalized } from "@halla/shared/utils/locale";
import styles from "./SubscriptionAssignmentPopup.module.css";

export default function SubscriptionAssignmentPopup({
  entity,
  onClose,
}) {
  const { t, i18n } = useTranslation("adminHosts");
  const queryClient = useQueryClient();

  const updateSubscription = useAdminHostMutation("updateSubscription");

  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useAdminPlans({ availableFor: "host" });

  const planOptions = useMemo(() => {
    const plans = plansData?.data?.plans || [];
    return plans.map((p) => ({
      label: getLocalized(p, "name", i18n.language),
      value: p.code,
      planType: p.planType,
    }));
  }, [plansData, i18n.language]);

  const statusOptions = [
    { label: t("subscription.statusActive"), value: "active" },
    { label: t("subscription.statusExpired"), value: "expired" },
    { label: t("subscription.statusCancelled"), value: "cancelled" },
  ];

  const methods = useForm({
    resolver: zodResolver(subscriptionAssignmentSchema),
    defaultValues: {
      planCode:
        entity?.subscription?.planId?.code ||
        entity?.subscription?.planType ||
        "",
      status: entity?.subscription?.status || "active",
    },
  });

  const onSubmit = async (data) => {
    try {
      await updateSubscription.mutateAsync({
        hostId: entity.id,
        planCode: data.planCode,
        status: data.status,
      });
      toastUtils.success(t("subscription.updateSuccess"));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleRetryPlans = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.plans({ availableFor: "host" }) });
  };

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
              <label>{t("subscription.hostName")}</label>
              <input
                type="text"
                value={entity?.name || entity?.username || ""}
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

            <div className={styles.actions}>
              <Button
                variant="secondary"
                title={t("subscription.cancel")}
                onClick={onClose}
                disabled={updateSubscription.isPending}
              />
              <Button
                variant="primary"
                title={
                  updateSubscription.isPending
                    ? t("subscription.updating")
                    : t("subscription.update")
                }
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
