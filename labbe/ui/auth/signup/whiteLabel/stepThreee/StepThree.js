"use client";
import React, { useEffect } from "react";
import styles from "./stepThree.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SectionTitle from "../../../../commen/title/SectionTitle";
import CheckBoxItems from "@/ui/commen/inputs/checkboxItems/CheckBoxItems";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";

const StepThree = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");
  const { watch } = useFormContext();
  const eventTypes = watch("systemRequirements.eventTypes") || [];
  const showOtherInput = eventTypes.includes("other");

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.whiteLabel.requirements.title")}
        description={t("signupForm.whiteLabel.requirements.description")}
        onArrowClick={() => {
          console.log("StepThree previous arrow clicked!");
          goToPreviousStep();
        }}
      />

      <div className={styles.sections}>
        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.whiteLabel.requirements.usage.title")}
            icon="/svg/auth/usage.svg"
            height={24}
            width={24}
          />

          <div className={styles.row}>
            <InputGroup
              label={t(
                "signupForm.whiteLabel.requirements.fields.numberOfEventsMonthly.label"
              )}
              type="number"
              placeholder={t(
                "signupForm.whiteLabel.requirements.fields.events.placeholder"
              )}
              required
              name="systemRequirements.numberOfEventsMonthly"
              iconPath="auth/calendar.svg"
            />
            <InputGroup
              label={t(
                "signupForm.whiteLabel.requirements.fields.numberOfGuestsMonthly.label"
              )}
              type="number"
              placeholder={t(
                "signupForm.whiteLabel.requirements.fields.guests.placeholder"
              )}
              required
              name="systemRequirements.numberOfGuestsMonthly"
              iconPath="auth/people.svg"
            />
          </div>
        </div>

        <div className={styles.section}>
          <SectionTitle
            title={t("signupForm.whiteLabel.requirements.eventTypes.title")}
            icon="/svg/auth/calendar.svg"
            height={24}
            width={24}
          />

          <div className={styles.options}>
            <CheckBoxItems
              items={t(
                "signupForm.whiteLabel.requirements.eventTypes.options",
                { returnObjects: true }
              )}
              name="systemRequirements.eventTypes"
              columns={2}
            />

            {showOtherInput && (
              <div style={{ marginTop: "1.6rem" }}>
                <InputGroup
                  label={t(
                    "signupForm.whiteLabel.requirements.eventTypes.otherLabel"
                  )}
                  type="text"
                  placeholder={t(
                    "signupForm.whiteLabel.requirements.eventTypes.otherPlaceholder"
                  )}
                  name="systemRequirements.eventsTypesOther"
                  iconPath="auth/edit.svg"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThree;
