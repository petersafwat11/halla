import React from "react";
import styles from "./stepThree.module.css";
import { useTranslation } from "react-i18next";
import UploadFile from "@/ui/commen/inputs/uploadFile/UploadFile";
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
            title={t("signupForm.vendor.samplesAndPackages.portfolioImages.label")}
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
              "signupForm.vendor.samplesAndPackages.pricePackages.label",
              "باقات الأسعار (1-5 ملفات)"
            )}
            height={24}
            width={24}
          />

          <UploadFile
            name="samplesAndPackages.pricePackages"
            multiple={true}
            acceptImages={true}
            acceptDocuments={true}
            maxFiles={5}
            placeholder={t(
              "signupForm.vendor.samplesAndPackages.pricePackages.placeholder",
              "رفع صور أو ملفات PDF لباقات الأسعار (حتى 5 ملفات)"
            )}
          />
        </div>

        <div className={styles.section}>
          <SectionTitle
            title={t(
              "signupForm.vendor.samplesAndPackages.profileFile.label",
              "الملف التعريفي للشركة (اختياري)"
            )}
            icon="/svg/auth/document.svg"
            height={24}
            width={24}
          />

          <UploadFile
            name="samplesAndPackages.profileFile"
            multiple={false}
            acceptImages={false}
            acceptDocuments={true}
            acceptOfficeDocuments={true}
            maxFiles={1}
            placeholder={t(
              "signupForm.vendor.samplesAndPackages.profileFile.placeholder",
              "رفع ملف PDF أو DOC أو DOCX (حتى 10 ميجابايت)"
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default StepThree;
