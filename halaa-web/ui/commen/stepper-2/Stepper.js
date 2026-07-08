import React from "react";
import styles from "./stepper.module.css";
import { FaCheck } from "react-icons/fa6";
import { useMediaQuery } from "@/hooks/use-media-query";

const Stepper = ({ currentStep, steps, onStepChange }) => {
  const isLg = useMediaQuery("(min-width: 600px)");

  if (!isLg) {
    // Mobile fallback: show only current step and label
    return (
      <div className={styles.stepperWrapper}>
        <div className={styles.stepperCard}>
          <div className={styles.horizontalStepper}>
            <div className={styles.stepItem}>
              {/* <div className={`${styles.stepCircle} ${styles.active}`}>
              {steps.find((s) => s.id === currentStep)?.id}
            </div> */}
              <div className={`${styles.stepLabel} ${styles.active}`}>
                {steps.find((s) => s.id === currentStep)?.label}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepperWrapper}>
      <div className={styles.stepperCard}>
        <div className={styles.horizontalStepper}>
          {steps.map((item, idx) => {
            const isCompleted = item.id < currentStep;
            const isCurrent = item.id === currentStep;
            return (
              <React.Fragment key={item.id}>
                <div className={styles.stepItem}>
                  <div
                    //  ${styles.active}
                    className={` ${
                      isCurrent
                        ? `${styles.stepCircle} ${styles.current}`
                        : isCompleted
                        ? `${styles.stepCircle} ${styles.active}`
                        : `${styles.stepCircle}`
                    }`}
                  >
                    {isCompleted ? <FaCheck size={12} /> : ""}
                    {isCurrent && <div className={styles.childCircle}> </div>}
                  </div>
                  <div
                    className={`${styles.stepLabel} ${
                      isCurrent ? ` ${styles.active}` : ""
                    }`}
                  >
                    {item.label}
                  </div>
                </div>
                {idx !== steps.length - 1 && (
                  <div className={styles.stepLineContainer}>
                    <div
                      className={`${styles.stepLine} ${
                        isCompleted ? styles.LineCompleted : ""
                      }`}
                    ></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Stepper;
