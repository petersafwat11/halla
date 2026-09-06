import React from "react";
import styles from "./stepFive.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SectionTitle from "../../../../commen/title/SectionTitle";
import { useTranslation } from "react-i18next";
import { normalizeDigitsOnly } from "@halaa/shared/utils/locale";

const StepFive = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.vendor.socialLinks.title")}
        description={t("signupForm.vendor.socialLinks.description")}
        onArrowClick={goToPreviousStep}
      />
      <div className={styles.sections}>
        {/* Social Media and Links Section */}
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.vendor.socialLinks.title")}
            icon="/svg/auth/link.svg"
            height={24}
            width={24}
          />
          <div className={styles.inputs}>
            <InputGroup
              label={t("signupForm.vendor.socialLinks.whatsapp.label", { defaultValue: "WhatsApp" })}
              type="tel"
              placeholder={t("signupForm.vendor.socialLinks.whatsapp.placeholder", { defaultValue: "05xxxxxxxx" })}
              name="socialLinks.whatsapp"
              iconPath="auth/link.svg"
              direction="ltr"
              inputMode="numeric"
              sanitize={normalizeDigitsOnly}
            />
            <InputGroup
              label={t("signupForm.vendor.socialLinks.instagram.label", { defaultValue: "Instagram" })}
              type="url"
              placeholder="https://instagram.com/yourbrand"
              name="socialLinks.instagram"
              iconPath="auth/instagram.svg"
              direction="ltr"
            />
            <InputGroup
              label={t("signupForm.vendor.socialLinks.twitter.label", { defaultValue: "Twitter / X" })}
              type="url"
              placeholder="https://x.com/yourbrand"
              name="socialLinks.twitter"
              iconPath="auth/link.svg"
              direction="ltr"
            />
            <InputGroup
              label={t("signupForm.vendor.socialLinks.facebook.label", { defaultValue: "Facebook" })}
              type="url"
              placeholder="https://facebook.com/yourbrand"
              name="socialLinks.facebook"
              iconPath="auth/link.svg"
              direction="ltr"
            />
            <InputGroup
              label={t("signupForm.vendor.socialLinks.tiktok.label", { defaultValue: "TikTok" })}
              type="url"
              placeholder="https://tiktok.com/@yourbrand"
              name="socialLinks.tiktok"
              iconPath="auth/link.svg"
              direction="ltr"
            />
            <InputGroup
              label={t("signupForm.vendor.socialLinks.linkedin.label", { defaultValue: "LinkedIn" })}
              type="url"
              placeholder="https://linkedin.com/in/yourbrand"
              name="socialLinks.linkedin"
              iconPath="auth/link.svg"
              direction="ltr"
            />
            <InputGroup
              label={t("signupForm.vendor.socialLinks.youtube.label", { defaultValue: "YouTube" })}
              type="url"
              placeholder="https://youtube.com/@yourbrand"
              name="socialLinks.youtube"
              iconPath="auth/link.svg"
              direction="ltr"
            />
            <InputGroup
              label={t("signupForm.vendor.socialLinks.website.label", { defaultValue: "Website" })}
              type="url"
              placeholder="https://yourwebsite.com"
              name="socialLinks.website"
              iconPath="auth/link.svg"
              direction="ltr"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepFive;
