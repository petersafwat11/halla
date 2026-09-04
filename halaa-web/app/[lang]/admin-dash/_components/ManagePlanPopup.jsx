"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FiCopy, FiPlusCircle, FiRefreshCw, FiX } from "react-icons/fi";
import {
  adminKeys,
  useAdminBusinessMutation,
  useAdminHostMutation,
  useAssignablePlans,
} from "@/hooks/admin";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { getLocalized, formatDate } from "@halaa/shared/utils/locale";
import styles from "./ManagePlanPopup.module.css";

const INVITE_PRESETS = [10, 25, 50, 100, 250, 500];

const getEntityId = (entity, entityId) => entityId || entity?.id || entity?._id;

const getCurrentPlanCode = (subscription) =>
  subscription?.planId?.code ||
  subscription?.planCode ||
  subscription?.code ||
  "";

const getRemainingInvites = (subscription) => {
  if (!subscription) return "-";
  if (subscription.invitePool === null || subscription.invitePool === undefined) return "Unlimited";
  if (subscription.invitesRemaining !== undefined && subscription.invitesRemaining !== null) {
    return subscription.invitesRemaining;
  }
  return (
    (subscription.invitePool || 0) +
    (subscription.compensationPool || 0) -
    (subscription.invitesConsumed || 0)
  );
};

const formatPlanMeta = (plan, t) => {
  const price = plan?.price ?? plan?.pricing?.oneTime ?? 0;
  const currency = plan?.currency || "SAR";
  const totalInvites =
    plan?.invitePool === null || plan?.invitePool === undefined
      ? t("managePlan.unlimited", "Unlimited")
      : (plan.invitePool || 0) + (plan.compensationPool || 0);
  return `${price} ${currency} - ${totalInvites} ${t("managePlan.invites", "invites")}`;
};

export default function ManagePlanPopup({
  entity,
  entityId,
  entityType = "host",
  onClose,
}) {
  const isBusiness = entityType === "business";
  const { t, i18n } = useTranslation(isBusiness ? "adminBusinesses" : "adminHosts");
  const queryClient = useQueryClient();

  const id = getEntityId(entity, entityId);
  const subscription = entity?.subscription || null;
  const [tab, setTab] = useState("change");
  const [planCode, setPlanCode] = useState(getCurrentPlanCode(subscription));
  const [businessMode, setBusinessMode] = useState("grant");
  const [reason, setReason] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [quantity, setQuantity] = useState("25");
  const [addAfterChange, setAddAfterChange] = useState(false);
  const [checkoutLink, setCheckoutLink] = useState(null);

  const { data: plansData, isLoading: plansLoading, error: plansError } = useAssignablePlans({
    availableFor: isBusiness ? "business" : "host",
  });

  const updateHost = useAdminHostMutation("updateSubscription");
  const grantHostExtra = useAdminHostMutation("grantExtraInvites");
  const assignBusiness = useAdminBusinessMutation("assignPlan");
  const grantBusinessExtra = useAdminBusinessMutation("grantExtraInvites");

  const plans = useMemo(() => plansData?.data?.plans || [], [plansData]);
  const selectedPlan = plans.find((plan) => plan.code === planCode);

  const isCheckout = isBusiness && businessMode === "checkout";
  const changing = isBusiness ? assignBusiness.isPending : updateHost.isPending;
  const granting = isBusiness ? grantBusinessExtra.isPending : grantHostExtra.isPending;
  const isSubmitting = changing || granting;

  const summaryRows = [
    {
      label: t("managePlan.currentPlan", "Current plan"),
      value:
        getLocalized(subscription?.planId || {}, "name", i18n.language) ||
        subscription?.planId?.code ||
        subscription?.planType ||
        "-",
    },
    {
      label: t("managePlan.status", "Status"),
      value: subscription?.status || t("managePlan.none", "None"),
    },
    {
      label: t("managePlan.remaining", "Remaining invites"),
      value: getRemainingInvites(subscription),
    },
    {
      label: t("managePlan.ends", "Ends"),
      value: subscription?.currentPeriodEnd
        ? formatDate(subscription.currentPeriodEnd, i18n.language || "ar") || "-"
        : "-",
    },
  ];

  const invalidatePlans = () => {
    queryClient.invalidateQueries({
      queryKey: adminKeys.assignablePlans({ availableFor: isBusiness ? "business" : "host" }),
    });
  };

  const grantExtraInvites = async () => {
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 500) {
      toastUtils.warning(t("managePlan.invalidQuantity", "Enter 1 to 500 invites."));
      return;
    }

    if (isBusiness) {
      await grantBusinessExtra.mutateAsync({
        businessId: id,
        quantity: parsedQuantity,
        reason: reason || undefined,
      });
    } else {
      await grantHostExtra.mutateAsync({
        hostId: id,
        quantity: parsedQuantity,
        reason: reason || undefined,
      });
    }
  };

  const submitExtra = async () => {
    try {
      await grantExtraInvites();
      toastUtils.success(t("managePlan.extraSuccess", "Extra invites added."));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  const submitPlanChange = async () => {
    if (!planCode) {
      toastUtils.warning(t("managePlan.selectPlan", "Select a plan."));
      return;
    }

    try {
      if (isBusiness) {
        const result = await assignBusiness.mutateAsync({
          businessId: id,
          mode: businessMode,
          planCode,
          discountCode: isCheckout ? discountCode || undefined : undefined,
          grantReason: !isCheckout ? reason || undefined : undefined,
        });

        if (isCheckout) {
          const link = result?.data?.link;
          setCheckoutLink(link || null);
          toastUtils.success(t("managePlan.checkoutReady", "Checkout link created."));
          return;
        }
      } else {
        await updateHost.mutateAsync({
          hostId: id,
          planCode,
          reason: reason || undefined,
        });
      }

      if (addAfterChange) {
        await grantExtraInvites();
      }

      toastUtils.success(t("managePlan.changeSuccess", "Plan updated."));
      onClose();
    } catch (error) {
      handleError(error, t);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (tab === "extra") {
      submitExtra();
    } else {
      submitPlanChange();
    }
  };

  const copyCheckoutLink = async () => {
    if (!checkoutLink) return;
    try {
      await navigator.clipboard.writeText(checkoutLink);
      toastUtils.success(t("managePlan.linkCopied", "Link copied."));
    } catch (error) {
      handleError(error, t);
    }
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose} size="auto">
      <form className={styles.popup} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>
              {isBusiness
                ? t("managePlan.business", "Business")
                : t("managePlan.host", "Host")}
            </p>
            <h2>{t("managePlan.title", "Manage plan")}</h2>
            <span>{entity?.name || entity?.email || "-"}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title={t("common.close", "Close")}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.summaryGrid}>
          {summaryRows.map((row) => (
            <div className={styles.summaryItem} key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            className={tab === "change" ? styles.tabActive : styles.tab}
            onClick={() => setTab("change")}
          >
            <FiRefreshCw size={15} />
            {t("managePlan.changePlan", "Change plan")}
          </button>
          <button
            type="button"
            className={tab === "extra" ? styles.tabActive : styles.tab}
            onClick={() => setTab("extra")}
          >
            <FiPlusCircle size={15} />
            {t("managePlan.extraInvites", "Extra invites")}
          </button>
        </div>

        {checkoutLink ? (
          <div className={styles.checkoutBox}>
            <label>{t("managePlan.checkoutLink", "Checkout link")}</label>
            <div className={styles.copyRow}>
              <input value={checkoutLink} readOnly dir="ltr" />
              <button
                type="button"
                className={styles.iconTextBtn}
                onClick={copyCheckoutLink}
              >
                <FiCopy size={15} />
                {t("managePlan.copy", "Copy")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {tab === "change" && (
              <div className={styles.section}>
                {isBusiness && (
                  <div className={styles.segmented}>
                    <button
                      type="button"
                      className={businessMode === "grant" ? styles.segmentActive : styles.segment}
                      onClick={() => setBusinessMode("grant")}
                    >
                      {t("managePlan.grant", "Grant")}
                    </button>
                    <button
                      type="button"
                      className={businessMode === "checkout" ? styles.segmentActive : styles.segment}
                      onClick={() => setBusinessMode("checkout")}
                    >
                      {t("managePlan.checkout", "Checkout")}
                    </button>
                  </div>
                )}

                <label className={styles.field}>
                  <span>{t("managePlan.plan", "Plan")}</span>
                  <select
                    value={planCode}
                    onChange={(event) => setPlanCode(event.target.value)}
                    disabled={plansLoading || !!plansError}
                  >
                    <option value="">{t("managePlan.selectPlan", "Select a plan")}</option>
                    {plans.map((plan) => (
                      <option key={plan.code} value={plan.code}>
                        {getLocalized(plan, "name", i18n.language) || plan.code} - {formatPlanMeta(plan, t)}
                      </option>
                    ))}
                  </select>
                </label>

                {plansLoading && (
                  <p className={styles.inlineState}>{t("managePlan.loadingPlans", "Loading plans...")}</p>
                )}
                {plansError && (
                  <div className={styles.inlineError}>
                    <span>{t("managePlan.planLoadError", "Could not load plans.")}</span>
                    <button type="button" onClick={invalidatePlans}>
                      {t("managePlan.retry", "Retry")}
                    </button>
                  </div>
                )}

                {selectedPlan && (
                  <div className={styles.planPreview}>
                    <strong>{getLocalized(selectedPlan, "name", i18n.language) || selectedPlan.code}</strong>
                    <span>{formatPlanMeta(selectedPlan, t)}</span>
                  </div>
                )}

                {isCheckout ? (
                  <label className={styles.field}>
                    <span>{t("managePlan.discountCode", "Discount code")}</span>
                    <input
                      value={discountCode}
                      onChange={(event) => setDiscountCode(event.target.value)}
                      placeholder={t("managePlan.discountPlaceholder", "Optional")}
                    />
                  </label>
                ) : (
                  <label className={styles.field}>
                    <span>{t("managePlan.reason", "Reason")}</span>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={t("managePlan.reasonPlaceholder", "Optional")}
                    />
                  </label>
                )}

                {!isCheckout && (
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={addAfterChange}
                      onChange={(event) => setAddAfterChange(event.target.checked)}
                    />
                    <span>{t("managePlan.addExtraAfterChange", "Add extra invites after update")}</span>
                  </label>
                )}
              </div>
            )}

            {(tab === "extra" || (tab === "change" && addAfterChange && !isCheckout)) && (
              <div className={styles.section}>
                <div className={styles.presetRow}>
                  {INVITE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={Number(quantity) === preset ? styles.presetActive : styles.preset}
                      onClick={() => setQuantity(String(preset))}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <label className={styles.field}>
                  <span>{t("managePlan.quantity", "Quantity")}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>
                {tab === "extra" && (
                  <label className={styles.field}>
                    <span>{t("managePlan.reason", "Reason")}</span>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={t("managePlan.reasonPlaceholder", "Optional")}
                    />
                  </label>
                )}
              </div>
            )}
          </>
        )}

        <div className={styles.actions}>
          <Button
            variant="secondary"
            title={checkoutLink ? t("managePlan.done", "Done") : t("common.cancel", "Cancel")}
            onClick={onClose}
            disabled={isSubmitting}
          />
          {!checkoutLink && (
            <Button
              variant="primary"
              title={
                isSubmitting
                  ? t("managePlan.saving", "Saving...")
                  : tab === "extra"
                  ? t("managePlan.addInvites", "Add invites")
                  : t("managePlan.updatePlan", "Update plan")
              }
              type="submit"
              disabled={isSubmitting || (tab === "change" && (plansLoading || !!plansError))}
            />
          )}
        </div>
      </form>
    </PopupLayout>
  );
}
