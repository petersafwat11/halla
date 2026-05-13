"use client";

import { useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminHostMutation, useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useAdminPlans } from "@/hooks/reactQueryHooks/useAdmin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { subscriptionAssignmentSchema } from "@/utils/schemas/adminPopupSchemas";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import { getLocalized } from "@/utils/locale";
import styles from "./SubscriptionAssignmentPopup.module.css";

export default function SubscriptionAssignmentPopup({
  entity,
  entityType = "host",
  onClose,
}) {
  const tNamespace = entityType === "host" ? "adminHosts" : "adminWhitelabels";
  const { t, i18n } = useTranslation(tNamespace);
  const queryClient = useQueryClient();

  const hostMutation = useAdminHostMutation("updateSubscription");
  const whitelabelMutation = useAdminWhitelabelMutation("updateSubscription");
  const updateSubscription =
    entityType === "host" ? hostMutation : whitelabelMutation;

  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useAdminPlans({ availableFor: entityType });

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
      const idKey = entityType === "host" ? "hostId" : "whitelabelId";
      await updateSubscription.mutateAsync({
        [idKey]: entity.id,
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
    queryClient.invalidateQueries({ queryKey: ["admin", "plans", { availableFor: entityType }] });
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
              <label>{t(entityType === "host" ? "subscription.hostName" : "subscription.whitelabel")}</label>
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
