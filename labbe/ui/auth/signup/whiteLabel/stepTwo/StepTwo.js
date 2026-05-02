import React from "react";
import styles from "./stepTwo.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SectionTitle from "../../../../commen/title/SectionTitle";
import { useTranslation } from "react-i18next";

const StepTwo = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.whiteLabel.login.title")}
        description={t("signupForm.whiteLabel.login.description")}
        onArrowClick={goToPreviousStep}
      />

      <div className={styles.sections}>
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.whiteLabel.login.title")}
            icon="/svg/auth/personal-info.svg"
            height={24}
            width={24}
          />

          <div className={styles.inputs}>
            <InputGroup
              label={t("signupForm.whiteLabel.login.fields.email.label")}
              type="email"
              placeholder={t(
                "signupForm.whiteLabel.login.fields.email.placeholder"
              )}
              required
              name="loginData.email"
              iconPath="auth/email.svg"
            />
            <InputGroup
              label={t("signupForm.whiteLabel.login.fields.phoneNumber.label")}
              type="tel"
              placeholder={t(
                "signupForm.whiteLabel.login.fields.phoneNumber.placeholder"
              )}
              required
              name="loginData.phoneNumber"
              iconPath="auth/phone.svg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwo;
