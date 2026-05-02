import React from "react";
import styles from "./stepThree.module.css";
import { useTranslation } from "react-i18next";
import UploadFile from "@/ui/commen/inputs/uploadFile/UploadFile";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import SectionTitle, { StepTitle } from "@/ui/commen/title/SectionTitle";

const StepThree = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.vendor.samplesAndPackages.title")}
        description={t("signupForm.vendor.samplesAndPackages.description")}
        onArrowClick={goToPreviousStep}
      />
      <div className={styles.sections}>
        <div className={styles.section}>
          <SectionTitle
            title="رفع 1: 3 صور من اعمالك السابقة"
            icon="/svg/auth/document-copy.svg"
            height={24}
            width={24}
          />
          <UploadFile
            name="samplesAndPackages.portfolioImages"
            multiple={true}
            acceptImages={true}
            placeholder={t(
              "signupForm.vendor.samplesAndPackages.portfolioImages.placeholder"
            )}
          />
        </div>

        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.vendor.samplesAndPackages.businessLogo.label")}
            height={24}
            width={24}
          />
          <UploadFile
            name="samplesAndPackages.businessLogo"
            multiple={false}
            acceptImages={true}
            placeholder={t(
              "signupForm.vendor.samplesAndPackages.businessLogo.placeholder"
            )}
          />
        </div>

        <div className={styles.section}>
          <SectionTitle
            title={t(
              "signupForm.vendor.samplesAndPackages.pricePackages.label"
            )}
            height={24}
            width={24}
          />

          <UploadFile
            name="samplesAndPackages.pricePackages"
            multiple={false}
            acceptImages={true}
            placeholder={t(
              "signupForm.vendor.samplesAndPackages.pricePackages.placeholder"
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default StepThree;
