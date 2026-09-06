import React, { useMemo } from "react";
import styles from "./stepSix.module.css";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SummarySection from "./SummarySection";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";

const StepSix = ({ goToPreviousStep, onEditStep }) => {
  const { t, i18n } = useTranslation("signup");
  const { t: tCommon } = useTranslation("common");
  const { watch } = useFormContext();
  const vendorData = watch();

  // Format location for display
  const serviceLocationData = useMemo(() => {
    const loc = vendorData?.serviceData?.serviceLocation;
    if (!loc) return null;
    const parts = [];
    const isArabic = i18n.language?.startsWith("ar");
    if (loc.regionNameAr || loc.regionNameEn) {
      parts.push(isArabic ? (loc.regionNameAr || loc.regionNameEn) : (loc.regionNameEn || loc.regionNameAr));
    }
    if (loc.cityNameAr || loc.cityNameEn) {
      parts.push(isArabic ? (loc.cityNameAr || loc.cityNameEn) : (loc.cityNameEn || loc.cityNameAr));
    }
    if (loc.coverageType) {
      const typeLabel =
        loc.coverageType === "region"
          ? t("signupForm.vendor.serviceData.coverageArea.region", { defaultValue: "كامل المنطقة" })
          : loc.coverageType === "districts"
          ? t("signupForm.vendor.serviceData.coverageArea.districts", { defaultValue: "أحياء محددة" })
          : t("signupForm.vendor.serviceData.coverageArea.city", { defaultValue: "المدينة" });
      parts.push(`(${typeLabel})`);
    }
    return parts.length > 0 ? parts.join(" - ") : null;
  }, [vendorData?.serviceData?.serviceLocation, t, i18n.language]);

  const augmentedServiceData = useMemo(() => {
    return {
      ...vendorData?.serviceData,
      formattedLocation: serviceLocationData,
    };
  }, [vendorData?.serviceData, serviceLocationData]);

  // Normalize social links
  const socialLinksData = useMemo(() => {
    const s = vendorData?.socialLinks || {};
    return {
      whatsapp: s.whatsapp || "",
      instagram: s.instagram || "",
      twitter: s.twitter || "",
      facebook: s.facebook || "",
      tiktok: s.tiktok || "",
      linkedin: s.linkedin || "",
      youtube: s.youtube || "",
      website: s.website || "",
    };
  }, [vendorData?.socialLinks]);

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.vendor.summary.title")}
        description={t("signupForm.vendor.summary.description")}
        onArrowClick={goToPreviousStep}
      />

      <div className={styles.sections}>
        {/* Step 1: Account Information */}
        <SummarySection
          title={t("signupForm.vendor.identity.title")}
          icon="/svg/auth/info-circle.svg"
          data={vendorData.identity}
          stepNumber={1}
          onEdit={onEditStep}
          editLabel={tCommon("actions.edit", { defaultValue: "تعديل" })}
          fields={[
            {
              key: "brandName",
              label: t("signupForm.vendor.identity.brandName.label"),
              type: "text",
            },
            {
              key: "ownerFullName",
              label: t("signupForm.vendor.identity.ownerFullName.label"),
              type: "text",
            },
            {
              key: "phoneNumber",
              label: t("signupForm.vendor.identity.phoneNumber.label"),
              type: "text",
            },
            {
              key: "email",
              label: t("signupForm.vendor.identity.email.label"),
              type: "text",
            },
            {
              key: "preferredLanguage",
              label: t("signupForm.vendor.identity.preferredLanguage", { defaultValue: "اللغة المفضلة" }),
              type: "text",
            },
          ]}
        />

        {/* Step 2: Service Data & Categories */}
        <SummarySection
          title={t("signupForm.vendor.serviceData.title")}
          icon="/svg/auth/setting-2.svg"
          data={augmentedServiceData}
          stepNumber={2}
          onEdit={onEditStep}
          editLabel={tCommon("actions.edit", { defaultValue: "تعديل" })}
          fields={[
            {
              key: "serviceDescription",
              label: t("signupForm.vendor.serviceData.serviceDescription.label"),
              type: "text",
            },
            {
              key: "formattedLocation",
              label: t("signupForm.vendor.serviceData.serviceLocation", { defaultValue: "منطقة التغطية" }),
              type: "text",
            },
            {
              key: "taglineAr",
              label: t("signupForm.vendor.serviceData.taglineAr", { defaultValue: "الشعار بالعربية" }),
              type: "text",
            },
            {
              key: "taglineEn",
              label: t("signupForm.vendor.serviceData.taglineEn", { defaultValue: "الشعار بالإنجليزية" }),
              type: "text",
            },
            {
              key: "aboutAr",
              label: t("signupForm.vendor.serviceData.aboutAr", { defaultValue: "نبذة عن المزود بالعربية" }),
              type: "text",
            },
            {
              key: "aboutEn",
              label: t("signupForm.vendor.serviceData.aboutEn", { defaultValue: "نبذة عن المزود بالإنجليزية" }),
              type: "text",
            },
            {
              key: "eventPlanning",
              label: t("signupForm.vendor.serviceData.eventPlanning.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.eventPlanning.options", { returnObjects: true }),
            },
            {
              key: "mediaProduction",
              label: t("signupForm.vendor.serviceData.mediaProduction.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.mediaProduction.options", { returnObjects: true }),
            },
            {
              key: "giftsAndGiveaways",
              label: t("signupForm.vendor.serviceData.giftsAndGiveaways.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.giftsAndGiveaways.options", { returnObjects: true }),
            },
            {
              key: "foodAndBeverages",
              label: t("signupForm.vendor.serviceData.foodAndBeverages.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.foodAndBeverages.options", { returnObjects: true }),
            },
            {
              key: "beautyAndFashion",
              label: t("signupForm.vendor.serviceData.beautyAndFashion.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.beautyAndFashion.options", { returnObjects: true }),
            },
            {
              key: "logisticsAndDelivery",
              label: t("signupForm.vendor.serviceData.logisticsAndDelivery.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.logisticsAndDelivery.options", { returnObjects: true }),
            },
            {
              key: "corporateServices",
              label: t("signupForm.vendor.serviceData.corporateServices.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.corporateServices.options", { returnObjects: true }),
            },
            {
              key: "supportServices",
              label: t("signupForm.vendor.serviceData.supportServices.title", { defaultValue: "خدمات مساندة" }),
              type: "array",
              options: t("signupForm.vendor.serviceData.supportServices.options", { returnObjects: true }),
            },
            {
              key: "technicalServices",
              label: t("signupForm.vendor.serviceData.technicalServices.title", { defaultValue: "خدمات تقنية" }),
              type: "array",
              options: t("signupForm.vendor.serviceData.technicalServices.options", { returnObjects: true }),
            },
            {
              key: "soundLightingEntertainment",
              label: t("signupForm.vendor.serviceData.soundLightingEntertainment.title", { defaultValue: "صوتيات وإضاءة وترفيه" }),
              type: "array",
              options: t("signupForm.vendor.serviceData.soundLightingEntertainment.options", { returnObjects: true }),
            },
            {
              key: "hallsAndVenues",
              label: t("signupForm.vendor.serviceData.hallsAndVenues.title", { defaultValue: "قاعات وأماكن" }),
              type: "array",
              options: t("signupForm.vendor.serviceData.hallsAndVenues.options", { returnObjects: true }),
            },
            {
              key: "otherData",
              label: t("signupForm.vendor.serviceData.otherData.label", { defaultValue: "ملاحظات إضافية" }),
              type: "text",
            },
          ]}
        />

        {/* Step 3: Samples & Packages */}
        <SummarySection
          title={t("signupForm.vendor.samplesAndPackages.title")}
          icon="/svg/auth/document-copy.svg"
          data={vendorData.samplesAndPackages}
          stepNumber={3}
          onEdit={onEditStep}
          editLabel={tCommon("actions.edit", { defaultValue: "تعديل" })}
          fields={[
            {
              key: "businessLogo",
              label: t("signupForm.vendor.samplesAndPackages.businessLogo.label"),
              type: "logo",
            },
            {
              key: "portfolioImages",
              label: t("signupForm.vendor.samplesAndPackages.portfolioImages.label"),
              type: "file",
            },
            {
              key: "pricePackages",
              label: t("signupForm.vendor.samplesAndPackages.pricePackages.label"),
              type: "document",
            },
            {
              key: "profileFile",
              label: t("signupForm.vendor.samplesAndPackages.profileFile.label", { defaultValue: "الملف التعريفي" }),
              type: "document",
            },
          ]}
        />

        {/* Step 4: Commercial Verification */}
        <SummarySection
          title={t("signupForm.vendor.commercialVerification.title")}
          icon="/svg/auth/building-1.svg"
          data={vendorData.commercialVerification}
          stepNumber={4}
          onEdit={onEditStep}
          editLabel={tCommon("actions.edit", { defaultValue: "تعديل" })}
          fields={[
            {
              key: "commercialRecordNumber",
              label: t("signupForm.vendor.commercialVerification.commercialRecord.label"),
              type: "text",
            },
            {
              key: "commercialRecordImage",
              label: t("signupForm.vendor.commercialVerification.commercialRecord.imageLabel", { defaultValue: "وثيقة السجل التجاري" }),
              type: "document",
            },
            {
              key: "nationalId",
              label: t("signupForm.vendor.commercialVerification.nationalId.label"),
              type: "text",
            },
            {
              key: "nationalIdImage",
              label: t("signupForm.vendor.commercialVerification.nationalId.imageLabel", { defaultValue: "وثيقة الهوية الوطنية" }),
              type: "document",
            },
          ]}
        />

        {/* Step 5: Social Links */}
        <SummarySection
          title={t("signupForm.vendor.steps.socialLinks")}
          icon="/svg/auth/link.svg"
          data={socialLinksData}
          stepNumber={5}
          onEdit={onEditStep}
          editLabel={tCommon("actions.edit", { defaultValue: "تعديل" })}
          fields={[
            {
              key: "whatsapp",
              label: t("signupForm.vendor.socialLinks.whatsapp.label", { defaultValue: "واتساب" }),
              type: "text",
            },
            {
              key: "instagram",
              label: t("signupForm.vendor.socialLinks.instagram.label"),
              type: "text",
            },
            {
              key: "twitter",
              label: t("signupForm.vendor.socialLinks.twitter.label", { defaultValue: "تويتر (X)" }),
              type: "text",
            },
            {
              key: "facebook",
              label: t("signupForm.vendor.socialLinks.facebook.label"),
              type: "text",
            },
            {
              key: "tiktok",
              label: t("signupForm.vendor.socialLinks.tiktok.label"),
              type: "text",
            },
            {
              key: "linkedin",
              label: t("signupForm.vendor.socialLinks.linkedin.label", { defaultValue: "لينكد إن" }),
              type: "text",
            },
            {
              key: "youtube",
              label: t("signupForm.vendor.socialLinks.youtube.label", { defaultValue: "يوتيوب" }),
              type: "text",
            },
            {
              key: "website",
              label: t("signupForm.vendor.socialLinks.website.label"),
              type: "text",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default StepSix;
