import React from "react";
import styles from "./stepFour.module.css";
import SectionTitle, { StepTitle } from "@/ui/commen/title/SectionTitle";
import { useTranslation } from "react-i18next";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import UploadFile from "@/ui/commen/inputs/uploadFile/UploadFile";

const StepFour = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.vendor.steps.commercialVerification")}
        description={t(
          "signupForm.vendor.steps.commercialVerificationDescription"
        )}
        onArrowClick={goToPreviousStep}
      />
      <div className={styles.sections}>
        {/* Commercial Record Section */}
        <div className={styles.section}>
          <SectionTitle
            title={t(
              "signupForm.vendor.commercialVerification.commercialRecord.title"
            )}
            icon="/svg/auth/building-1.svg"
            height={24}
            width={24}
          />
          <UploadFile
            name="commercialVerification.commercialRecordImage"
            multiple={false}
            acceptImages={true}
            placeholder={t(
              "signupForm.vendor.commercialVerification.commercialRecord.placeholder"
            )}
          />
          <div className={styles.inputs}>
            <InputGroup
              name="commercialVerification.commercialRecordNumber"
              label={t(
                "signupForm.vendor.commercialVerification.commercialRecord.label",
                "رقم السجل التجارى"
              )}
              placeholder={t(
                "signupForm.vendor.commercialVerification.commercialRecord.numberPlaceholder",
                "أدخل رقم السجل التجارى"
              )}
              type="text"
              required
              iconPath="auth/document.svg"
              hint={t(
                "signupForm.vendor.commercialVerification.commercialRecord.hint",
                "يجب أن يكون 10 أرقام (مثال: 1234567890)"
              )}
            />
          </div>
        </div>

        {/* National ID Section */}
        <div className={styles.section}>
          <SectionTitle
            title={t(
              "signupForm.vendor.commercialVerification.nationalId.title",
              "صورة الهوية الوطنية"
            )}
            icon="/svg/auth/document.svg"
            height={24}
            width={24}
          />
          <UploadFile
            name="commercialVerification.nationalIdImage"
            multiple={false}
            acceptImages={true}
            placeholder={t(
              "signupForm.vendor.commercialVerification.nationalId.imagePlaceholder",
              "ارفع صورة الهوية الوطنية"
            )}
          />
          <div className={styles.inputs}>
            <InputGroup
              name="commercialVerification.nationalId"
              label={t(
                "signupForm.vendor.commercialVerification.nationalId.label",
                "رقم الهوية الوطنية"
              )}
              placeholder={t(
                "signupForm.vendor.commercialVerification.nationalId.placeholder",
                "أدخل رقم الهوية الوطنية"
              )}
              type="text"
              required
              iconPath="auth/document.svg"
              hint={t(
                "signupForm.vendor.commercialVerification.nationalId.hint",
                "يجب أن يكون 10 أرقام ويبدأ بـ 1 (مواطن) أو 2 (مقيم)"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepFour;
