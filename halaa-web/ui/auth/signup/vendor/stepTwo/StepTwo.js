"use client";
import React, { useState } from "react";
import styles from "./stepTwo.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import TextArea from "@/ui/commen/inputs/inputGroup/TextArea";
import CheckBoxItems from "@/ui/commen/inputs/checkboxItems/CheckBoxItems";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SectionTitle from "../../../../commen/title/SectionTitle";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import LocationSelector from "./LocationSelector";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import {
  FiCalendar,
  FiVideo,
  FiGift,
  FiCoffee,
  FiStar,
  FiTruck,
  FiBriefcase,
  FiUsers,
  FiCpu,
  FiMusic,
  FiMapPin,
} from "react-icons/fi";
import {
  sanitizeArabicText,
  sanitizeEnglishText,
} from "@halaa/shared/utils/languageInput";

const CATEGORY_DEFINITIONS = [
  { key: "eventPlanning", titleKey: "signupForm.vendor.serviceData.eventPlanning.title", optionsKey: "signupForm.vendor.serviceData.eventPlanning.options", icon: FiCalendar },
  { key: "mediaProduction", titleKey: "signupForm.vendor.serviceData.mediaProduction.title", optionsKey: "signupForm.vendor.serviceData.mediaProduction.options", icon: FiVideo },
  { key: "giftsAndGiveaways", titleKey: "signupForm.vendor.serviceData.giftsAndGiveaways.title", optionsKey: "signupForm.vendor.serviceData.giftsAndGiveaways.options", icon: FiGift },
  { key: "foodAndBeverages", titleKey: "signupForm.vendor.serviceData.foodAndBeverages.title", optionsKey: "signupForm.vendor.serviceData.foodAndBeverages.options", icon: FiCoffee },
  { key: "beautyAndFashion", titleKey: "signupForm.vendor.serviceData.beautyAndFashion.title", optionsKey: "signupForm.vendor.serviceData.beautyAndFashion.options", icon: FiStar },
  { key: "logisticsAndDelivery", titleKey: "signupForm.vendor.serviceData.logisticsAndDelivery.title", optionsKey: "signupForm.vendor.serviceData.logisticsAndDelivery.options", icon: FiTruck },
  { key: "corporateServices", titleKey: "signupForm.vendor.serviceData.corporateServices.title", optionsKey: "signupForm.vendor.serviceData.corporateServices.options", icon: FiBriefcase },
  { key: "supportServices", titleKey: "signupForm.vendor.serviceData.supportServices.title", optionsKey: "signupForm.vendor.serviceData.supportServices.options", icon: FiUsers },
  { key: "technicalServices", titleKey: "signupForm.vendor.serviceData.technicalServices.title", optionsKey: "signupForm.vendor.serviceData.technicalServices.options", icon: FiCpu },
  { key: "soundLightingEntertainment", titleKey: "signupForm.vendor.serviceData.soundLightingEntertainment.title", optionsKey: "signupForm.vendor.serviceData.soundLightingEntertainment.options", icon: FiMusic },
  { key: "hallsAndVenues", titleKey: "signupForm.vendor.serviceData.hallsAndVenues.title", optionsKey: "signupForm.vendor.serviceData.hallsAndVenues.options", icon: FiMapPin },
];

const StepTwo = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");
  const { t: tCommon } = useTranslation("common");
  const formContext = useFormContext();
  const watch = formContext?.watch;

  // Open first category by default
  const [openCategories, setOpenCategories] = useState({ eventPlanning: true });

  const toggleCategory = (key) => {
    setOpenCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.vendor.serviceData.title")}
        description={t("signupForm.vendor.serviceData.description")}
        onArrowClick={goToPreviousStep}
      />
      <div className={styles.sections}>
        {/* Service Description Section */}
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.vendor.serviceData.serviceDescription.title")}
            icon="/svg/auth/setting-2.svg"
            height={24}
            width={24}
          />
          <div className={styles.inputs}>
            <TextArea
              label={t("signupForm.vendor.serviceData.serviceDescription.label")}
              placeholder={t("signupForm.vendor.serviceData.serviceDescription.placeholder")}
              required
              name="serviceData.serviceDescription"
              iconPath="auth/quote-circle.svg"
              maxLength={500}
              rows={3}
            />
            <InputGroup
              label={t("signupForm.vendor.serviceData.taglineAr")}
              type="text"
              name="serviceData.taglineAr"
              placeholder={t("signupForm.vendor.serviceData.taglineArPlaceholder")}
              maxLength={160}
              direction="rtl"
              labelDirection="rtl"
              lang="ar"
              sanitize={sanitizeArabicText}
              hintMessage={t("signupForm.vendor.serviceData.errors.arabicOnly", { defaultValue: "استخدم الحروف العربية فقط" })}
            />
            <InputGroup
              label={t("signupForm.vendor.serviceData.taglineEn")}
              type="text"
              name="serviceData.taglineEn"
              placeholder={t("signupForm.vendor.serviceData.taglineEnPlaceholder")}
              maxLength={160}
              direction="ltr"
              labelDirection="ltr"
              lang="en"
              sanitize={sanitizeEnglishText}
              hintMessage={t("signupForm.vendor.serviceData.errors.englishOnly", { defaultValue: "Use English letters only" })}
            />
            <TextArea
              label={t("signupForm.vendor.serviceData.aboutAr")}
              name="serviceData.aboutAr"
              placeholder={t("signupForm.vendor.serviceData.aboutArPlaceholder")}
              maxLength={2000}
              rows={4}
              direction="rtl"
              labelDirection="rtl"
              lang="ar"
              sanitize={sanitizeArabicText}
            />
            <TextArea
              label={t("signupForm.vendor.serviceData.aboutEn")}
              name="serviceData.aboutEn"
              placeholder={t("signupForm.vendor.serviceData.aboutEnPlaceholder")}
              maxLength={2000}
              rows={4}
              direction="ltr"
              labelDirection="ltr"
              lang="en"
              sanitize={sanitizeEnglishText}
            />
          </div>
        </div>

        {/* Service Categories with Progressive Disclosure Accordions */}
        {CATEGORY_DEFINITIONS.map((cat) => {
          const isOpen = Boolean(openCategories[cat.key]);
          const selectedValues = watch?.(`serviceData.${cat.key}`) || [];
          const count = Array.isArray(selectedValues) ? selectedValues.length : 0;
          const options = t(cat.optionsKey, { returnObjects: true });

          return (
            <div className={styles.section} key={cat.key}>
              <button
                type="button"
                className={styles.accordionHeader}
                onClick={() => toggleCategory(cat.key)}
                aria-expanded={isOpen}
              >
                <div className={styles.accordionTitleWrapper}>
                  <SectionTitle
                    title={t(cat.titleKey)}
                    icon={cat.icon}
                    height={24}
                    width={24}
                  />
                  {count > 0 && (
                    <span className={styles.badge}>
                      {count} {tCommon("selected")}
                    </span>
                  )}
                </div>
                <span className={styles.chevron}>
                  {isOpen ? <IoChevronUp /> : <IoChevronDown />}
                </span>
              </button>

              {isOpen && (
                <div className={styles.options}>
                  <CheckBoxItems
                    items={Array.isArray(options) ? options : []}
                    name={`serviceData.${cat.key}`}
                    columns={2}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Location Information */}
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.vendor.serviceData.location.title")}
            icon="/svg/auth/location.svg"
            height={24}
            width={24}
          />
          <div className={styles.inputs}>
            <LocationSelector />
          </div>
        </div>

        {/* Other Information */}
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.vendor.serviceData.otherInfo.title")}
            height={24}
            width={24}
          />
          <div className={styles.inputs}>
            <InputGroup
              label={t("signupForm.vendor.serviceData.otherData.label")}
              type="text"
              placeholder={t("signupForm.vendor.serviceData.otherData.placeholder")}
              name="serviceData.otherData"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwo;
