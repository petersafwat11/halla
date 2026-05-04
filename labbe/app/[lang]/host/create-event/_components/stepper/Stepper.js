"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./stepper.module.css";

// Phase 4c W1-WIZARD-RENAME — locked 6-step structure (D4c-1).
// Post-review polish: labels are i18n-driven via the existing
// `step{N}_title` keys in createEvent.json (already EN+AR). The
// hardcoded Arabic strings remain as defaults so the stepper still
// renders if a translator removes the namespace.
const STEP_DEFAULTS = [
  { id: 1, key: "step1_title", fallback: "تفاصيل المناسبة" },
  { id: 2, key: "step2_title", fallback: "الضيوف وفريق العمل" },
  { id: 3, key: "step3_title", fallback: "تصميم الدعوة" },
  { id: 4, key: "step4_title", fallback: "قالب الواتساب" },
  { id: 5, key: "step5_title", fallback: "نص الرسالة والردود" },
  { id: 6, key: "step6_title", fallback: "مراجعة وإطلاق" },
];

const Stepper = ({ currentStep = 1 }) => {
  let t;
  try {
    ({ t } = useTranslation("createEvent"));
  } catch (_) {
    t = (_k, fb) => fb;
  }
  const steps = STEP_DEFAULTS.map((s) => ({ id: s.id, label: t(s.key, s.fallback) }));
  return (
    <>
      {/* Desktop Stepper */}
      <div className={styles.stepper_desktop}>
        <div className={styles.stepper}>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={styles.step_wrapper}>
                <div
                  className={`${styles.step_number} ${
                    step.id === currentStep
                      ? styles.step_number_active
                      : styles.step_number_inactive
                  }`}
                >
                  {step.id !== currentStep && <div className={styles.dot} />}
                </div>
                <div className={styles.content}>
                  <div
                    className={`${styles.step_label} ${
                      step.id === currentStep
                        ? styles.step_label_active
                        : styles.step_label_inactive
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && <div className={styles.connector} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Stepper */}
      <div className={styles.stepper_mobile}>
        <div className={styles.stepper_mobile_container}>
          <div className={styles.stepper_mobile_header}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.arrow_icon}
            >
              <path
                d="M12.002 15.7486C11.9027 15.749 11.8047 15.7302 11.7129 15.6924C11.6211 15.6546 11.5371 15.599 11.4668 15.5288L5.8125 9.87453C5.74245 9.80498 5.68637 9.7225 5.64844 9.63137C5.61051 9.54023 5.59177 9.44248 5.5918 9.34377C5.5918 9.24521 5.6105 9.14763 5.64844 9.05666C5.68637 8.96569 5.74248 8.88335 5.8125 8.81398C5.88216 8.74416 5.96552 8.68865 6.05664 8.6509C6.14776 8.61314 6.24511 8.59367 6.34375 8.59377C6.44208 8.59371 6.54007 8.61314 6.63086 8.6509C6.72165 8.68866 6.80375 8.74422 6.87305 8.81398L12.002 13.9419L17.125 8.81398C17.1947 8.74416 17.278 8.68865 17.3691 8.6509C17.4603 8.61314 17.5576 8.59367 17.6562 8.59377C17.755 8.59306 17.8522 8.61213 17.9434 8.64992C18.0346 8.68771 18.1182 8.74366 18.1875 8.81398C18.2572 8.88363 18.3119 8.96612 18.3496 9.05715C18.3873 9.14817 18.4062 9.24573 18.4062 9.34426C18.4062 9.44279 18.3873 9.54034 18.3496 9.63137C18.3119 9.72239 18.2572 9.80488 18.1875 9.87453L12.5332 15.5288C12.3924 15.6697 12.2011 15.7485 12.002 15.7486Z"
                fill="#C28E5C"
              />
            </svg>
            <div className={styles.mobile_step_info}>
              <div className={styles.mobile_step_label}>
                {steps[currentStep - 1].label}
              </div>
            </div>
            <div className={styles.mobile_step_badge}>
              {currentStep}/{steps.length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Stepper;
