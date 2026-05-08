"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import PlanCard from "../PlanCard";
import styles from "../stepFive.module.css";

const QuarterlyPlansGroup = ({ plans, selectedPlanCode, onSelect }) => {
  const { t } = useTranslation("signup");
  const tp = (key) => t(`signupForm.whiteLabel.planSelection.${key}`);

  if (!plans || plans.length === 0) return null;

  return (
    <div>
      <div className={styles.planGroupHeader}>
        <h4 className={styles.planGroupTitle}>{tp("threeMonthPool")}</h4>
        <span className={styles.planGroupSubtitle}>
          {tp("threeMonthPoolDescription")}
        </span>
      </div>
      <div className={styles.plansGrid}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            type="quarterly"
            isSelected={selectedPlanCode === plan.code}
            onSelect={onSelect}
            limitLabel={tp("unlimitedEvents")}
          />
        ))}
      </div>
    </div>
  );
};

export default QuarterlyPlansGroup;
