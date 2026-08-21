"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "../EditPlanPopup.module.css";

// Multi-line textarea where each line becomes one bullet. Trims trailing
// whitespace and drops empty lines on save.
const bulletsArrayToText = (arr) => (Array.isArray(arr) ? arr.join("\n") : "");
const bulletsTextToArray = (text) =>
  (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const BulletInput = ({
  field,
  labelKey,
  placeholderKey,
  helpKey,
  dir,
  error,
}) => {
  const { t } = useTranslation("admin");
  const [rawText, setRawText] = React.useState(() =>
    bulletsArrayToText(field.value)
  );

  // Keep local state in sync if external form value resets
  React.useEffect(() => {
    const externalText = bulletsArrayToText(field.value);
    if (bulletsArrayToText(bulletsTextToArray(rawText)) !== externalText) {
      setRawText(externalText);
    }
  }, [field.value]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setRawText(newText);
    field.onChange(bulletsTextToArray(newText));
  };

  return (
    <div className={styles.bulletField}>
      <label className={styles.bulletLabel}>{t(labelKey)}</label>
      <textarea
        className={styles.bulletTextarea}
        dir={dir}
        rows={8}
        placeholder={t(placeholderKey)}
        value={rawText}
        onChange={handleChange}
      />
      <span className={styles.bulletHint}>
        {error?.message || (helpKey ? t(helpKey) : "")}
      </span>
    </div>
  );
};

const BulletField = ({
  name,
  labelKey,
  placeholderKey,
  helpKey,
  dir,
  error,
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <BulletInput
          field={field}
          labelKey={labelKey}
          placeholderKey={placeholderKey}
          helpKey={helpKey}
          dir={dir}
          error={error}
        />
      )}
    />
  );
};


const PlanFeatureBulletsSection = () => {
  const { t } = useTranslation("admin");
  const {
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.featureBullets")}
      </h3>

      <BulletField
        name="featureBullets.ar"
        labelKey="managePlans.editPopup.fields.featureBulletsAr.label"
        placeholderKey="managePlans.editPopup.fields.featureBulletsAr.placeholder"
        helpKey="managePlans.editPopup.fields.featureBulletsAr.help"
        dir="rtl"
        error={errors.featureBullets?.ar}
      />

      <BulletField
        name="featureBullets.en"
        labelKey="managePlans.editPopup.fields.featureBulletsEn.label"
        placeholderKey="managePlans.editPopup.fields.featureBulletsEn.placeholder"
        helpKey="managePlans.editPopup.fields.featureBulletsEn.help"
        dir="ltr"
        error={errors.featureBullets?.en}
      />
    </div>
  );
};

export default PlanFeatureBulletsSection;
