"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FiPlusCircle, FiRefreshCw, FiX } from "react-icons/fi";
import {
  adminKeys,
  useAdminBusinessMutation,
  useAdminHostMutation,
  useAssignablePlans,
} from "@/hooks/admin";
import { useAvailableAddons } from "@/hooks/addons";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import Button from "@/ui/commen/button/Button";
import CopyableLink from "@/ui/commen/CopyableLink/CopyableLink";
import StatusBadge from "@/components/shared/StatusBadge";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { getLocalized, formatDate, formatCount } from "@halaa/shared/utils/locale";
import styles from "./ManagePlanPopup.module.css";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";

const getEntityId = (entity, entityId) => entityId || entity?.id || entity?._id;

const getCurrentPlanCode = (subscription) =>
  subscription?.planId?.code ||
  subscription?.planCode ||
  subscription?.code ||
  "";

// Plan names are bilingual backend content. `getSummary()` payloads carry
// planNameAr/planNameEn; populated list/detail payloads carry them on planId.
// The raw plan code is never a customer-facing name, so it is not a fallback.
const getCurrentPlanName = (subscription, language) =>
  getLocalized(subscription || {}, "planName", language) ||
  getLocalized(subscription?.planId || {}, "name", language) ||
  "";

const getRemainingInvites = (subscription, language, unlimitedLabel) => {
  const balance = subscription?.invitationBalance;
  if (!balance) return "—";
  if (balance.unlimited) return unlimitedLabel;
  return formatCount(balance.remaining ?? 0, language);
};

const formatPlanInviteMeta = (plan, t, language) => {
  const totalInvites =
    plan?.invitePool === null || plan?.invitePool === undefined
      ? null
      : (plan.invitePool || 0) + (plan.compensationPool || 0);
  return totalInvites === null
    ? t("managePlan.unlimited", "Unlimited")
    : t("managePlan.invitesCount", {
        formatted: formatCount(totalInvites, language),
        defaultValue: "{{formatted}} invites",
      });
};

export default function ManagePlanPopup({
  entity,
  entityId,
  entityType = "host",
  onClose,
}) {
  const isBusiness = entityType === "business";
  const { t, i18n } = useTranslation(isBusiness ? "adminBusinesses" : "adminHosts");
  const language = i18n.language;
  const queryClient = useQueryClient();

  const id = getEntityId(entity, entityId);
  const subscription = entity?.subscription || null;
  const [tab, setTab] = useState("change");
  const [planCode, setPlanCode] = useState(getCurrentPlanCode(subscription));
  const [businessMode, setBusinessMode] = useState("grant");
  const [reason, setReason] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [addAfterChange, setAddAfterChange] = useState(false);
  const [checkoutLink, setCheckoutLink] = useState(null);

  const { data: plansData, isLoading: plansLoading, error: plansError } = useAssignablePlans({
    availableFor: isBusiness ? "business" : "host",
  });

  // Extra invites are sold as fixed catalog packages. Read them from the same
  // public catalog the host-facing add-ons picker uses so the admin can never
  // grant an off-catalog quantity.
  const {
    data: addonsData,
    isLoading: addonsLoading,
    error: addonsError,
    refetch: refetchAddons,
  } = useAvailableAddons();

  const updateHost = useAdminHostMutation("updateSubscription");
  const grantHostExtra = useAdminHostMutation("grantExtraInvites");
  const assignBusiness = useAdminBusinessMutation("assignPlan");
  const grantBusinessExtra = useAdminBusinessMutation("grantExtraInvites");

  const plans = useMemo(() => plansData?.data?.plans || [], [plansData]);
  const selectedPlan = plans.find((plan) => plan.code === planCode);
  const inviteTiers = useMemo(
    () => addonsData?.data?.extra_invites || [],
    [addonsData]
  );

  const isCheckout = isBusiness && businessMode === "checkout";
  const changing = isBusiness ? assignBusiness.isPending : updateHost.isPending;
  const granting = isBusiness ? grantBusinessExtra.isPending : grantHostExtra.isPending;
  const isSubmitting = changing || granting;

  const statusValue = subscription?.status || "";
  const periodEnd = subscription?.currentPeriodEnd || subscription?.expiresAt || null;
  const summaryRows = [
    {
      key: "plan",
      label: t("managePlan.currentPlan", "Current plan"),
      value: getCurrentPlanName(subscription, language) || t("managePlan.none", "None"),
    },
    {
      key: "status",
      label: t("managePlan.status", "Status"),
      // Status colors come from the shared status→tone map (web/mobile mirror).
      value: statusValue ? (
        <StatusBadge
          status={statusValue}
          domain="subscription"
          text={t(`managePlan.statusLabels.${statusValue}`, statusValue)}
        />
      ) : (
        t("managePlan.none", "None")
      ),
    },
    {
      key: "remaining",
      label: t("managePlan.remaining", "Remaining invites"),
      value: getRemainingInvites(
        subscription,
        language,
        t("managePlan.unlimited", "Unlimited")
      ),
    },
    {
      key: "ends",
      label: t("managePlan.ends", "Ends"),
      value: periodEnd ? formatDate(periodEnd, language || "ar") || "—" : "—",
    },
  ];

  const invalidatePlans = () => {
    queryClient.invalidateQueries({
      queryKey: adminKeys.assignablePlans({ availableFor: isBusiness ? "business" : "host" }),
    });
  };

  const grantExtraInvites = async () => {
    const parsedQuantity = Number(quantity);
    const tier = inviteTiers.find((option) => Number(option.quantity) === parsedQuantity);
    if (!tier) {
      toastUtils.warning(t("managePlan.selectPackage", "Select an invites package."));
      return false;
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
    return true;
  };

  const submitExtra = async () => {
    try {
      const ok = await grantExtraInvites();
      if (!ok) return;
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
        const ok = await grantExtraInvites();
        if (!ok) return;
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

  const showExtraSection =
    tab === "extra" || (tab === "change" && addAfterChange && !isCheckout);

  const renderInviteTiers = () => {
    if (addonsLoading) {
      return (
        <p className={styles.inlineState}>
          {t("managePlan.loadingPackages", "Loading packages...")}
        </p>
      );
    }
    if (addonsError) {
      return (
        <div className={styles.inlineError}>
          <span>{t("managePlan.packagesLoadError", "Could not load invite packages.")}</span>
          <button type="button" onClick={() => refetchAddons()}>
            {t("managePlan.retry", "Retry")}
          </button>
        </div>
      );
    }
    if (inviteTiers.length === 0) {
      return (
        <p className={styles.inlineState}>
          {t("managePlan.noPackages", "No invite packages available.")}
        </p>
      );
    }
    return (
      <div className={styles.tierGrid} role="radiogroup">
        {inviteTiers.map((tier) => {
          const active = Number(quantity) === Number(tier.quantity);
          return (
            <button
              key={tier.quantity}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? styles.tierActive : styles.tier}
              onClick={() => setQuantity(String(tier.quantity))}
            >
              <strong>{formatCount(tier.quantity, language)}</strong>
              <span>{t("managePlan.invites", "invites")}</span>
              <em>
                <MoneyAmount amount={tier.price} currency="SAR" locale={language} />
              </em>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <PopupLayout isOpen={true} onClose={onClose} size="auto">
      <form className={styles.popup} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <p className={styles.kicker}>
              {isBusiness
                ? t("managePlan.business", "Business")
                : t("managePlan.host", "Host")}
            </p>
            <h2>{t("managePlan.title", "Manage plan")}</h2>
            <span>{entity?.name || entity?.email || "—"}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title={t("common.close", "Close")}
          >
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.summaryGrid}>
            {summaryRows.map((row) => (
              <div className={styles.summaryItem} key={row.key}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          {checkoutLink ? (
            <div className={styles.linkPanel}>
              <p className={styles.linkPanelIntro}>
                {t(
                  "managePlan.linkReady",
                  "Share this link with the business to pay and activate the plan."
                )}
              </p>
              <CopyableLink
                url={checkoutLink}
                label={t("managePlan.checkoutLink", "Checkout link")}
                copyLabel={t("managePlan.copy", "Copy")}
                copiedLabel={t("managePlan.copied", "Copied")}
                hint={t(
                  "managePlan.linkHint",
                  "If copying fails, select the link above and copy it manually."
                )}
                onCopied={() => toastUtils.success(t("managePlan.linkCopied", "Link copied."))}
              />
            </div>
          ) : (
            <>
              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "change"}
                  className={tab === "change" ? styles.tabActive : styles.tab}
                  onClick={() => setTab("change")}
                >
                  <FiRefreshCw size={15} />
                  {t("managePlan.changePlan", "Change plan")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "extra"}
                  className={tab === "extra" ? styles.tabActive : styles.tab}
                  onClick={() => setTab("extra")}
                >
                  <FiPlusCircle size={15} />
                  {t("managePlan.extraInvites", "Extra invites")}
                </button>
              </div>

              {tab === "change" && (
                <div className={styles.section}>
                  {isBusiness && (
                    <div className={styles.segmented} role="radiogroup">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={businessMode === "grant"}
                        className={businessMode === "grant" ? styles.segmentActive : styles.segment}
                        onClick={() => setBusinessMode("grant")}
                      >
                        {t("managePlan.grant", "Prepaid")}
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={businessMode === "checkout"}
                        className={businessMode === "checkout" ? styles.segmentActive : styles.segment}
                        onClick={() => setBusinessMode("checkout")}
                      >
                        {t("managePlan.checkout", "Generate activation payment link")}
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
                          {getLocalized(plan, "name", language) || plan.code}
                          {" — "}
                          {formatPlanInviteMeta(plan, t, language)}
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
                      <strong>
                        {getLocalized(selectedPlan, "name", language) || selectedPlan.code}
                      </strong>
                      <span>
                        <MoneyAmount
                          amount={selectedPlan?.price ?? selectedPlan?.pricing?.oneTime ?? 0}
                          currency={selectedPlan?.currency || "SAR"}
                          locale={language}
                        />
                        <i>{formatPlanInviteMeta(selectedPlan, t, language)}</i>
                      </span>
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

              {showExtraSection && (
                <div className={styles.section}>
                  <div className={styles.field}>
                    <span>{t("managePlan.package", "Extra invites package")}</span>
                    {renderInviteTiers()}
                    {/* An admin grant creates a zero-price addon — the tier
                        price is the catalog list price, not a charge. */}
                    <p className={styles.hint}>
                      {t(
                        "managePlan.packagePriceHint",
                        "Prices shown are list prices — an admin grant is not charged."
                      )}
                    </p>
                  </div>
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
        </div>

        <div className={styles.actions}>
          {checkoutLink ? (
            <Button
              variant="primary"
              title={t("managePlan.done", "Done")}
              onClick={onClose}
            />
          ) : (
            <>
              <Button
                variant="secondary"
                title={t("common.cancel", "Cancel")}
                onClick={onClose}
                disabled={isSubmitting}
              />
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
            </>
          )}
        </div>
      </form>
    </PopupLayout>
  );
}
