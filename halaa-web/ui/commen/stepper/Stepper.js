import React from "react";
import styles from "./stepper.module.css";
import { FaArrowLeftLong, FaArrowRightLong, FaCheck } from "react-icons/fa6";
import { useTranslation } from "react-i18next";

const Stepper = ({ step, setStep, steps, isCurrentStepValid }) => {
  const { t } = useTranslation("signup");
  const totalSteps = steps.length;
  const currentStepData = steps.find((item) => item.id === step);
  
  return (
    <>
      <div className={styles.mobile_container}>
        <div className={styles.mobile_content}>
          <div className={styles.mobile_step_number_container}>
            <span className={styles.mobile_step_number}>{step}/{totalSteps}</span>
          </div>
          <div className={styles.mobile_step_desc_container}>
            {currentStepData?.desc}
          </div>
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.steps}>
          {steps.map((item, index) => {
            const isCompleted = item.id < step;
            const isCurrent = item.id === step;

            return (
              <div style={{ width: "100%" }} key={index}>
                <div className={styles.step}>
                  <p
                    className={`${styles.step_number} ${
                      isCompleted
                        ? styles.completed_step_number
                        : isCurrent
                        ? styles.current_step_number
                        : ""
                    }`}
                  >
                    {isCompleted ? <FaCheck /> : index + 1}
                  </p>

                  <div className={styles.step_text}>
                    <p
                      className={`${styles.step_title} ${
                        isCompleted
                          ? styles.completed_step_title
                          : isCurrent
                          ? styles.current_step_title
                          : ""
                      }`}
                    >
                      {" "}
                      {/* {t('signupForm.step')} */}
                      {/* {index + 1} */}
                    </p>
                    <p
                      className={`${styles.step_description} ${
                        isCompleted
                          ? styles.completed_step_description
                          : isCurrent
                          ? styles.current_step_description
                          : ""
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={`${styles.step_line} ${
                      isCompleted ? styles.completed_step_line : ""
                    }`}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Stepper;
