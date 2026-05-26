"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { FaSpinner, FaExclamationTriangle, FaCheck } from "react-icons/fa";
import { useBusinessPlans } from "@/hooks/reactQueryHooks/usePlans";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import { getLocalized } from "@/utils/locale";
import PlanDescription from "@/ui/plans/PlanDescription/PlanDescription";
import styles from "./stepFive.module.css";

const formatPrice = (n) => (n || 0).toLocaleString();

function EventPlanSelector({ plans, selectedCode, onSelect, tp, lang }) {
  const selectedPlan = plans.find((p) => p.code === selectedCode) || plans[0];
  const selectedInvites = selectedPlan?.limits?.maxInvitesPerEvent || 0;

  return (
    <div className={styles.hostCard}>
      <div>
        <div className={styles.guestLabel}>{tp("selectInvites")}</div>
        <div className={styles.guestTrack}>
          {plans.map((plan) => (
            <button
              key={plan.code}
              type="button"
              className={`${styles.guestBtn} ${selectedCode === plan.code ? styles.guestBtnActive : ""}`}
              onClick={() => onSelect(plan.code)}
            >
              <span className={styles.guestNum}>
                {plan.limits?.maxInvitesPerEvent || 0}
              </span>
              <span className={styles.guestUnit}>{tp("inviteUnit")}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.hostPrice}>
        <span className={styles.hostPriceNum}>
          {formatPrice(selectedPlan?.pricing?.oneTime)}
        </span>
        <span className={styles.hostPriceCur}>{tp("currency")}</span>
        <span className={styles.hostPricePer}>{tp("pricePerEvent")}</span>
      </div>

      <div className={styles.featSection}>
        <PlanDescription plan={selectedPlan} lang={lang} selectedInviteCount={selectedInvites} />
      </div>

      <button
        type="button"
        className={`${styles.ctaBtn} ${styles.ctaBtnActive}`}
        onClick={() => onSelect(selectedPlan.code)}
      >
        {tp("selected")}
      </button>
    </div>
  );
}

function PoolPlanCard({ plan, type, isSelected, onSelect, tp, i18n, lang }) {
  return (
    <div
      className={`${styles.planCard} ${isSelected ? styles.planCardSelected : ""}`}
      onClick={() => onSelect(plan.code)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(plan.code);
      }}
    >
      {isSelected && (
        <div className={styles.selectedBadge}>
          <FaCheck />
          <span>{tp("selected")}</span>
        </div>
      )}

      <div className={styles.planCardTop}>
        <div>
          <h3 className={styles.planCardName}>
            {getLocalized(plan, "name", i18n.language)}
          </h3>
        </div>
        <div className={styles.planPriceBox}>
          <div className={styles.planPriceRow}>
            <span className={styles.planPriceNum}>
              {formatPrice(plan.pricing?.oneTime)}
            </span>
            <span className={styles.planPriceCur}>{tp("currency")}</span>
          </div>
          <span className={styles.planPricePer}>
            {type === "quarterly" ? tp("pricePerQuarter") : tp("pricePerYear")}
          </span>
        </div>
      </div>

      <div className={styles.featSection}>
        <PlanDescription plan={plan} lang={lang} />
      </div>

      <button
        type="button"
        className={`${styles.ctaBtn} ${isSelected ? styles.ctaBtnActive : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(plan.code);
        }}
      >
        {isSelected ? tp("selected") : tp("selectPlan")}
      </button>
    </div>
  );
}

/* ─── StepFive ────────────────────────────────────────────────────────────── */
const StepFive = ({ goToPreviousStep }) => {
  const { t, i18n } = useTranslation("signup");
  const lang = i18n.language || "ar";
  const queryClient = useQueryClient();
  const { setValue, watch } = useFormContext();
  const tp = (key) => t(`signupForm.whiteLabel.planSelection.${key}`);

  const { data: plansData, isLoading: loading, error } = useBusinessPlans();

  const eventPlans = useMemo(
    () =>
      [...(plansData?.data?.event || [])].sort(
        (a, b) =>
          (a.limits?.maxInvitesPerEvent || 0) -
          (b.limits?.maxInvitesPerEvent || 0)
      ),
    [plansData]
  );
  const quarterlyPlans = plansData?.data?.quarterly || [];
  const annualPlans = plansData?.data?.annual || [];

  const hasEvent = eventPlans.length > 0;
  const hasQuarterly = quarterlyPlans.length > 0;
  const hasAnnual = annualPlans.length > 0;

  const [activeType, setActiveType] = useState(() => {
    if (hasEvent) return "event";
    if (hasQuarterly) return "quarterly";
    return "annual";
  });

  const visiblePlans =
    activeType === "event"
      ? eventPlans
      : activeType === "quarterly"
        ? quarterlyPlans
        : annualPlans;

  const selectedPlanCode = watch("planSelection.planCode");

  const handleSelect = (code) => {
    const type = eventPlans.some((p) => p.code === code)
      ? "event"
      : quarterlyPlans.some((p) => p.code === code)
        ? "quarterly"
        : "annual";
    setValue("planSelection.planCode", code);
    setValue("planSelection.planType", type);
  };

  useEffect(() => {
    const currentInVisible = visiblePlans.some(
      (p) => p.code === selectedPlanCode
    );
    if (!currentInVisible && visiblePlans.length > 0) {
      setValue("planSelection.planCode", visiblePlans[0].code);
    }
  }, [activeType, visiblePlans, selectedPlanCode, setValue]);

  if (loading) {
    return (
      <div className={styles.container}>
        <StepTitle title={tp("title")} onArrowClick={goToPreviousStep} />
        <div className={styles.stateBox}>
          <FaSpinner className={styles.spinner} />
          <p>{tp("loadingPlans")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <StepTitle title={tp("title")} onArrowClick={goToPreviousStep} />
        <div className={styles.stateBox}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <p>{tp("loadError")}</p>
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["plans", "business"] })
            }
            className={styles.retryBtn}
          >
            {tp("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <StepTitle
        title={tp("title")}
        description={tp("description")}
        onArrowClick={goToPreviousStep}
      />

      {/* Toggle bar */}
      <div className={styles.selectorBox}>
        <div className={styles.toggleRow}>
          {hasEvent && (
            <button
              type="button"
              className={`${styles.toggleBtn} ${activeType === "event" ? styles.toggleActive : ""}`}
              onClick={() => setActiveType("event")}
            >
              {tp("perEventPlans")}
            </button>
          )}
          {hasQuarterly && (
            <button
              type="button"
              className={`${styles.toggleBtn} ${activeType === "quarterly" ? styles.toggleActive : ""}`}
              onClick={() => setActiveType("quarterly")}
            >
              {tp("threeMonthPool")}
            </button>
          )}
          {hasAnnual && (
            <button
              type="button"
              className={`${styles.toggleBtn} ${activeType === "annual" ? styles.toggleActive : ""}`}
              onClick={() => setActiveType("annual")}
            >
              {tp("annualPool")}
            </button>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className={styles.plansArea}>
        {activeType === "event" && (
          <EventPlanSelector
            plans={eventPlans}
            selectedCode={selectedPlanCode}
            onSelect={handleSelect}
            tp={tp}
            lang={lang}
          />
        )}

        {activeType === "quarterly" && (
          <div
            className={
              quarterlyPlans.length === 1
                ? styles.singlePlanWrap
                : styles.planGrid
            }
          >
            {quarterlyPlans.map((plan) => (
              <PoolPlanCard
                key={plan.code}
                plan={plan}
                type="quarterly"
                isSelected={selectedPlanCode === plan.code}
                onSelect={handleSelect}
                tp={tp}
                i18n={i18n}
                lang={lang}
              />
            ))}
          </div>
        )}

        {activeType === "annual" && (
          <div
            className={
              annualPlans.length === 1 ? styles.singlePlanWrap : styles.planGrid
            }
          >
            {annualPlans.map((plan) => (
              <PoolPlanCard
                key={plan.code}
                plan={plan}
                type="annual"
                isSelected={selectedPlanCode === plan.code}
                onSelect={handleSelect}
                tp={tp}
                i18n={i18n}
                lang={lang}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepFive;
