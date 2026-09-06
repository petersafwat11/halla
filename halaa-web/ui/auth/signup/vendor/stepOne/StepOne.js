import React from "react";
import styles from "./stepOne.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import MobileInputGroup from "@/ui/commen/inputs/mobileInputGroup/MobileInputGroup";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SectionTitle from "../../../../commen/title/SectionTitle";
import { useTranslation } from "react-i18next";

const StepOne = () => {
  const { t } = useTranslation("signup");

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.vendor.identity.title")}
        description={t("signupForm.vendor.identity.description")}
      />
      <div className={styles.sections}>
        {/* Business Activity Info Section */}
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.vendor.identity.businessInfo.title")}
            icon="/svg/auth/info-circle.svg"
            height={24}
            width={24}
          />
          <div className={styles.inputs}>
            <InputGroup
              label={t("signupForm.vendor.identity.brandName.label")}
              type="text"
              placeholder={t(
                "signupForm.vendor.identity.brandName.placeholder"
              )}
              required
              name="identity.brandName"
              iconPath="auth/profile-circle.svg"
            />
            <InputGroup
              label={t("signupForm.vendor.identity.ownerFullName.label")}
              type="text"
              placeholder={t(
                "signupForm.vendor.identity.ownerFullName.placeholder"
              )}
              required
              name="identity.ownerFullName"
              iconPath="auth/profile-circle.svg"
            />
          </div>
        </div>

        {/* Contact Information Section */}
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.vendor.identity.contactInfo.title")}
            icon="/svg/auth/call-calling.svg"
            height={24}
            width={24}
          />
          <div className={styles.inputs}>
            <MobileInputGroup
              label={t("signupForm.vendor.identity.phoneNumber.label")}
              type="tel"
              placeholder={t(
                "signupForm.vendor.identity.phoneNumber.placeholder"
              )}
              required
              name="identity.phoneNumber"
            />

            <InputGroup
              label={t("signupForm.vendor.identity.email.label")}
              type="email"
              placeholder={t("signupForm.vendor.identity.email.placeholder")}
              required
              name="identity.email"
              iconPath="auth/email.svg"
            />
          </div>
          <div className={styles.inputs}>
            <InputGroup
              label={t("signupForm.vendor.identity.password.label")}
              type="password"
              placeholder={t("signupForm.vendor.identity.password.placeholder")}
              required
              name="identity.password"
              iconPath="auth/password.svg"
              hintMessage={t("signupForm.vendor.identity.password.hint", {
                defaultValue: "At least 8 characters with letters and numbers",
              })}
            />

            <InputGroup
              label={t("signupForm.vendor.identity.passwordConfirm.label")}
              type="password"
              placeholder={t(
                "signupForm.vendor.identity.passwordConfirm.placeholder"
              )}
              required
              name="identity.passwordConfirm"
              iconPath="auth/password.svg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOne;
