"use client";
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { useBusinessPlans } from "@/hooks/reactQueryHooks/usePlans";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import EventPlansGroup from "./_components/EventPlansGroup";
import QuarterlyPlansGroup from "./_components/QuarterlyPlansGroup";
import AnnualPlansGroup from "./_components/AnnualPlansGroup";
import PlanFeaturesPanel from "./_components/PlanFeaturesPanel";
import styles from "./stepFive.module.css";

const StepFive = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");
  const queryClient = useQueryClient();
  const { setValue, watch } = useFormContext();
  const tp = (key) => t(`signupForm.whiteLabel.planSelection.${key}`);

  // React Query hook for business plans
  const { data: plansData, isLoading: loading, error } = useBusinessPlans();

  const eventPlans = plansData?.data?.event || [];
  const quarterlyPlans = plansData?.data?.quarterly || [];
  const annualPlans = plansData?.data?.annual || [];
  const allPlans = [...eventPlans, ...quarterlyPlans, ...annualPlans];

  const selectedPlanCode = watch("planSelection.planCode");
  const selectedPlan = allPlans.find((p) => p.code === selectedPlanCode);

  // Auto-select first plan when data loads
  useEffect(() => {
    if (allPlans.length > 0 && !selectedPlanCode) {
      setValue("planSelection.planCode", allPlans[0].code);
    }
  }, [allPlans.length, selectedPlanCode, setValue]);

  const handlePlanSelect = (planCode) => {
    setValue("planSelection.planCode", planCode);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <StepTitle title={tp("title")} onArrowClick={goToPreviousStep} />
        <div className={styles.loadingContainer}>
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
        <div className={styles.errorContainer}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <p>{tp("loadError")}</p>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["plans", "business"] })}
            className={styles.retryButton}
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

      <div className={styles.plansSection}>
        <EventPlansGroup
          plans={eventPlans}
          selectedPlanCode={selectedPlanCode}
          onSelect={handlePlanSelect}
        />
        <QuarterlyPlansGroup
          plans={quarterlyPlans}
          selectedPlanCode={selectedPlanCode}
          onSelect={handlePlanSelect}
        />
        <AnnualPlansGroup
          plans={annualPlans}
          selectedPlanCode={selectedPlanCode}
          onSelect={handlePlanSelect}
        />
      </div>

      <PlanFeaturesPanel plan={selectedPlan} />
    </div>
  );
};

export default StepFive;
