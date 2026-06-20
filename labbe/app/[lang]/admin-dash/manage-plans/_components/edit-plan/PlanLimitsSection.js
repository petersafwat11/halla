"use client";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import styles from "../EditPlanPopup.module.css";

/**
 * `unlimitedSentinel` differs per backend field:
 *   - maxEvents → -1 (the schema rejects null, accepts -1 sentinel)
 *   - invitePool / maxHosts → null (nullable)
 */
const LimitField = ({
  fieldName,
  labelKey,
  placeholderKey,
  helpKey,
  unlimitedSentinel,
  defaultEditableValue,
}) => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  const error = fieldName.split(".").reduce((acc, k) => acc?.[k], errors);

  return (
    <Controller
      name={fieldName}
      control={control}
      render={({ field }) => {
        const isUnlimited =
          unlimitedSentinel === null
            ? field.value === null
            : field.value === unlimitedSentinel;

        const handleToggle = () => {
          if (isUnlimited) {
            field.onChange(defaultEditableValue);
          } else {
            field.onChange(unlimitedSentinel);
          }
        };

        return (
          <div className={styles.limitRow}>
            <div className={styles.limitField}>
              <InputGroup
                label={t(labelKey)}
                placeholder={t(placeholderKey)}
                hintMessage={error?.message || (helpKey ? t(helpKey) : undefined)}
                error={!!error}
                type="number"
                name={fieldName}
                disabled={isUnlimited}
                value={isUnlimited ? "" : (field.value ?? "")}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === "" ? null : Number(v));
                }}
              />
            </div>
            <label className={styles.limitToggle}>
              <input
                type="checkbox"
                checked={isUnlimited}
                onChange={handleToggle}
              />
              <span>{t("managePlans.editPopup.unlimited")}</span>
            </label>
          </div>
        );
      }}
    />
  );
};

const PlanLimitsSection = () => {
  const { t } = useTranslation("admin");
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        {t("managePlans.editPopup.sections.limits")}
      </h3>

      <LimitField
        fieldName="limits.maxEvents"
        labelKey="managePlans.editPopup.fields.maxEvents.label"
        placeholderKey="managePlans.editPopup.fields.maxEvents.placeholder"
        helpKey="managePlans.editPopup.fields.maxEvents.help"
        unlimitedSentinel={-1}
        defaultEditableValue={1}
      />

      <LimitField
        fieldName="limits.invitePool"
        labelKey="managePlans.editPopup.fields.invitePool.label"
        placeholderKey="managePlans.editPopup.fields.invitePool.placeholder"
        helpKey="managePlans.editPopup.fields.invitePool.help"
        unlimitedSentinel={null}
        defaultEditableValue={100}
      />

      <div className={styles.row}>
        <Controller
          name="limits.durationDays"
          control={control}
          render={({ field }) => (
            <InputGroup
              label={t("managePlans.editPopup.fields.durationDays.label")}
              placeholder={t(
                "managePlans.editPopup.fields.durationDays.placeholder"
              )}
              hintMessage={errors.limits?.durationDays?.message}
              error={!!errors.limits?.durationDays}
              type="number"
              name="limits.durationDays"
              value={field.value ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? undefined : Number(v));
              }}
            />
          )}
        />
      </div>

      <LimitField
        fieldName="limits.maxHosts"
        labelKey="managePlans.editPopup.fields.maxHosts.label"
        placeholderKey="managePlans.editPopup.fields.maxHosts.placeholder"
        helpKey="managePlans.editPopup.fields.maxHosts.help"
        unlimitedSentinel={null}
        defaultEditableValue={1}
      />
    </div>
  );
};

export default PlanLimitsSection;
