"use client";

import { useMemo, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminBusinessMutation, useAdminPlans, adminKeys } from "@/hooks/admin";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { getLocalized } from "@halla/shared/utils/locale";
import { FiCopy } from "react-icons/fi";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import styles from "./BusinessPopup.module.css";

export default function AssignPlanPopup({ businessId, onClose }) {
  const { t, i18n } = useTranslation("adminBusinesses");
  const queryClient = useQueryClient();
  const assignPlan = useAdminBusinessMutation("assignPlan");

  const [mode, setMode] = useState("grant"); // 'grant' | 'checkout'
  const [grantReason, setGrantReason] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [checkoutLink, setCheckoutLink] = useState(null);

  const { data: plansData, isLoading: isLoadingPlans, error: plansError } = useAdminPlans({
    availableFor: "business",
  });

  const planOptions = useMemo(() => {
    const plans = plansData?.data?.plans || [];
    return plans.map((p) => ({
      label: getLocalized(p, "name", i18n.language),
      value: p.code,
    }));
  }, [plansData, i18n.language]);

  const methods = useForm({ defaultValues: { planCode: "" } });

  const onSubmit = async (values) => {
    if (!values.planCode) {
      toastUtils.warning(t("assignPlan.noPlanSelected"));
      return;
    }
    try {
      const payload = { businessId, mode, planCode: values.planCode };
      if (mode === "grant") {
        payload.grantReason = grantReason || undefined;
      } else {
        payload.discountCode = discountCode || undefined;
      }

      const res = await assignPlan.mutateAsync(payload);

      if (mode === "checkout") {
        const link = res?.data?.link;
        setCheckoutLink(link || null);
        toastUtils.success(t("assignPlan.checkoutSuccess"));
      } else {
        toastUtils.success(t("assignPlan.grantSuccess"));
        onClose();
      }
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleRetryPlans = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.plans({ availableFor: "business" }) });
  };

  const handleCopyLink = async () => {
    if (!checkoutLink) return;
    try {
      await navigator.clipboard.writeText(checkoutLink);
      toastUtils.success(t("assignPlan.linkCopied"));
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose} size="auto">
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{t("assignPlan.title")}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {checkoutLink ? (
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>{t("assignPlan.checkoutLinkLabel")}</label>
              <div className={styles.linkRow}>
                <input type="text" className={styles.input} value={checkoutLink} readOnly />
                <button type="button" className={styles.copyBtn} onClick={handleCopyLink}>
                  <FiCopy size={15} /> {t("assignPlan.copyLink")}
                </button>
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" title={t("assignPlan.done")} onClick={onClose} />
            </div>
          </div>
        ) : (
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.formGroup}>
                <label>{t("assignPlan.modeLabel")}</label>
                <div className={styles.modeToggle}>
                  <button
                    type="button"
                    className={`${styles.modeOption} ${mode === "grant" ? styles.modeOptionActive : ""}`}
                    onClick={() => setMode("grant")}
                  >
                    {t("assignPlan.modeGrant")}
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeOption} ${mode === "checkout" ? styles.modeOptionActive : ""}`}
                    onClick={() => setMode("checkout")}
                  >
                    {t("assignPlan.modeCheckout")}
                  </button>
                </div>
              </div>

              {isLoadingPlans ? (
                <div className={styles.formGroup}>
                  <p>{t("assignPlan.loadingPlans")}</p>
                </div>
              ) : plansError ? (
                <div className={styles.formGroup}>
                  <p>{t("assignPlan.errorLoadingPlans")}</p>
                  <Button variant="secondary" title={t("assignPlan.retry")} onClick={handleRetryPlans} />
                </div>
              ) : (
                <InputSelect
                  label={t("assignPlan.plan")}
                  placeholder={t("assignPlan.selectPlan")}
                  name="planCode"
                  options={planOptions}
                  required
                />
              )}

              {mode === "grant" ? (
                <div className={styles.formGroup}>
                  <label>{t("assignPlan.grantReason")}</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t("assignPlan.grantReasonPlaceholder")}
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                  />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label>{t("assignPlan.discountCode")}</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={t("assignPlan.discountCodePlaceholder")}
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  title={t("common.cancel")}
                  onClick={onClose}
                  disabled={assignPlan.isPending}
                />
                <Button
                  variant="primary"
                  title={assignPlan.isPending ? t("assignPlan.submitting") : t("assignPlan.submit")}
                  type="submit"
                  disabled={assignPlan.isPending || isLoadingPlans || !!plansError}
                />
              </div>
            </form>
          </FormProvider>
        )}
      </div>
    </PopupLayout>
  );
}
