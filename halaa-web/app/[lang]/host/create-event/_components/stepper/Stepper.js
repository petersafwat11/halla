"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./stepper.module.css";

// 5-step wizard: details → guests+staff → visual template → taqnyat+replies → summary
const STEP_DEFAULTS = [
  { id: 1, key: "step1_title", fallback: "تفاصيل المناسبة" },
  { id: 2, key: "step2_title", fallback: "الضيوف ومشرفين البوابة" },
  { id: 3, key: "step3_title", fallback: "تصميم الدعوة" },
  { id: 4, key: "step4_title", fallback: "قالب الواتساب والردود" },
  { id: 5, key: "step5_title", fallback: "مراجعة وإطلاق" },
];

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12.5L9.5 17L19 7.5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * `onStepClick` turns the track into a section switcher (the update-event
 * wizard, where every step is already reachable). Interactive steps render as
 * buttons and the track stays on screen at every width, because collapsing to
 * the read-only mobile summary would strip the navigation on phones.
 */
const Stepper = ({ currentStep = 1, totalSteps = 5, onStepClick = null, ariaLabel }) => {
  const { t } = useTranslation("createEvent");
  const isInteractive = typeof onStepClick === "function";
  const TrackTag = isInteractive ? "nav" : "div";
  const steps = STEP_DEFAULTS.slice(0, totalSteps).map((s) => ({
    id: s.id,
    label: t(s.key, s.fallback),
  }));

  const statusClass = (id) => {
    if (id < currentStep) return styles.step_completed;
    if (id === currentStep) return styles.step_active;
    return styles.step_upcoming;
  };

  return (
    <>
      {/* Desktop Stepper */}
      <div
        className={`${styles.stepper_desktop} ${
          isInteractive ? styles.stepper_interactive : ""
        }`}
      >
        {/* A <nav> only when the steps actually navigate; otherwise it's a
            progress indicator and an aria-label on a bare div is not exposed. */}
        <TrackTag
          className={styles.stepper}
          {...(isInteractive ? { "aria-label": ariaLabel } : {})}
        >
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            const StepTag = isInteractive ? "button" : "div";
            return (
              <React.Fragment key={step.id}>
                <StepTag
                  className={`${styles.step_wrapper} ${statusClass(step.id)}`}
                  {...(isInteractive
                    ? {
                        type: "button",
                        onClick: () => onStepClick(step.id),
                        "aria-current": isActive ? "step" : undefined,
                      }
                    : {})}
                >
                  <div className={styles.step_number}>
                    {isCompleted ? (
                      <CheckIcon />
                    ) : (
                      <span className={styles.step_digit}>{step.id}</span>
                    )}
                    {isActive && <span className={styles.step_pulse} aria-hidden="true" />}
                  </div>
                  <div className={styles.content}>
                    <div className={styles.step_label}>{step.label}</div>
                  </div>
                </StepTag>
                {index < steps.length - 1 && (
                  <div
                    className={`${styles.connector} ${
                      step.id < currentStep ? styles.connector_filled : ""
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </TrackTag>
      </div>

      {/* Mobile Stepper — a read-only summary, so the interactive variant
          skips it entirely and keeps its tappable track instead. */}
      {!isInteractive && (
        <div className={styles.stepper_mobile}>
          <div className={styles.stepper_mobile_container}>
            <div className={styles.stepper_mobile_header}>
              <div className={styles.mobile_step_badge}>
                <span className={styles.mobile_badge_current}>{currentStep}</span>
                <span className={styles.mobile_badge_divider}>/</span>
                <span className={styles.mobile_badge_total}>{steps.length}</span>
              </div>
              <div className={styles.mobile_step_info}>
                <div className={styles.mobile_step_eyebrow}>
                  {t("step_label", "الخطوة")} {currentStep}
                </div>
                <div className={styles.mobile_step_label}>
                  {steps[currentStep - 1].label}
                </div>
              </div>
            </div>
            <div className={styles.mobile_progress_track}>
              <div
                className={styles.mobile_progress_fill}
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Stepper;
