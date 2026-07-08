"use client";

import React from "react";
import Button from "@/ui/commen/button/Button";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import ToggleInput from "@/ui/commen/inputs/toggelInput/ToggelInput";
import styles from "./FieldsSection.module.css";

const FIELD_TYPE_OPTIONS = [
  { label: "Text", value: "text" },
  { label: "Textarea", value: "textarea" },
  { label: "Date", value: "date" },
  { label: "Time", value: "time" },
  { label: "Color", value: "color" },
  { label: "Font", value: "font" },
  { label: "Number", value: "number" },
];

const DIRECTION_OPTIONS = [
  { label: "Auto", value: "auto" },
  { label: "LTR", value: "ltr" },
  { label: "RTL", value: "rtl" },
];

const INPUT_MODE_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Text", value: "text" },
  { label: "Numeric", value: "numeric" },
  { label: "Decimal", value: "decimal" },
  { label: "Tel", value: "tel" },
  { label: "Email", value: "email" },
  { label: "URL", value: "url" },
];

export default function FieldRow({ idx, type, fieldKey, isExpanded, onToggle, onRemove, t }) {
  return (
    <div className={`${styles.fieldCard} ${isExpanded ? styles.expanded : ""}`}>
      <div className={styles.fieldCardHeader} onClick={onToggle}>
        <div className={styles.fieldCardHeaderLeft}>
          <span className={styles.fieldIndex}>{idx + 1}</span>
          <div className={styles.fieldCardInfo}>
            <span className={styles.fieldCardKey}>{fieldKey || `field_${idx + 1}`}</span>
            <span className={styles.fieldCardType}>{type}</span>
          </div>
        </div>
        <div className={styles.fieldCardHeaderRight}>
          <svg
            className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <Button
            type="button"
            variant="danger"
            size="small"
            title={t("templates.panel.delete")}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className={styles.fieldCardBody}>
          <div className={styles.configGroup}>
            <h4 className={styles.configGroupTitle}>{t("templates.panel.identity", "Identity")}</h4>
            <div className={styles.formGrid}>
              <InputGroup
                label={t("templates.panel.fieldKey")}
                placeholder="field_key"
                name={`fields.${idx}.key`}
                required
              />
              <InputSelect
                label={t("templates.panel.fieldType")}
                name={`fields.${idx}.type`}
                placeholder={t("templates.panel.selectType", "Select type")}
                options={FIELD_TYPE_OPTIONS}
              />
            </div>
          </div>

          <div className={styles.configGroup}>
            <h4 className={styles.configGroupTitle}>{t("templates.panel.labels", "Labels")}</h4>
            <div className={styles.formGrid}>
              <InputGroup
                label={t("templates.panel.labelEn")}
                placeholder={t("templates.panel.labelEnPlaceholder", "Field name in English")}
                name={`fields.${idx}.labelEn`}
                required
              />
              <InputGroup
                label={t("templates.panel.labelAr")}
                placeholder={t("templates.panel.labelArPlaceholder", "اسم الحقل بالعربية")}
                name={`fields.${idx}.labelAr`}
                required
              />
            </div>
          </div>

          <div className={styles.configGroup}>
            <h4 className={styles.configGroupTitle}>{t("templates.panel.placeholders", "Placeholders")}</h4>
            <div className={styles.formGrid}>
              <InputGroup
                label={t("templates.panel.placeholderEn")}
                placeholder={t("templates.panel.placeholderEnPlaceholder", "Enter placeholder (EN)")}
                name={`fields.${idx}.placeholderEn`}
              />
              <InputGroup
                label={t("templates.panel.placeholderAr")}
                placeholder={t("templates.panel.placeholderArPlaceholder", "أدخل النص التوضيحي (AR)")}
                name={`fields.${idx}.placeholderAr`}
              />
            </div>
          </div>

          <div className={styles.configGroup}>
            <h4 className={styles.configGroupTitle}>{t("templates.panel.validation", "Validation")}</h4>
            <div className={styles.validationRow}>
              <div className={styles.toggleWrapper}>
                <ToggleInput
                  name={`fields.${idx}.required`}
                  label={t("templates.panel.required")}
                />
              </div>
              {(type === "text" || type === "textarea" || type === "email" || type === "password") && (
                <div className={styles.formGrid}>
                  <InputGroup label={t("templates.panel.minLen")} placeholder="0" name={`fields.${idx}.minLength`} type="number" />
                  <InputGroup label={t("templates.panel.maxLen")} placeholder={t("templates.panel.unlimited", "Unlimited")} name={`fields.${idx}.maxLength`} type="number" />
                </div>
              )}
              {type === "number" && (
                <div className={styles.formGrid3}>
                  <InputGroup label={t("templates.panel.minVal")} placeholder="Min" name={`fields.${idx}.min`} type="number" />
                  <InputGroup label={t("templates.panel.maxVal")} placeholder="Max" name={`fields.${idx}.max`} type="number" />
                  <InputGroup label={t("templates.panel.step")} placeholder="Step" name={`fields.${idx}.step`} type="number" />
                </div>
              )}
              {type === "textarea" && (
                <div className={styles.formField}>
                  <InputGroup label={t("templates.panel.rows")} placeholder="4" name={`fields.${idx}.rows`} type="number" />
                </div>
              )}
            </div>
          </div>

          <div className={styles.configGroup}>
            <h4 className={styles.configGroupTitle}>{t("templates.panel.advanced", "Advanced")}</h4>
            <div className={styles.formGrid}>
              <InputGroup
                label={t("templates.panel.defaultValue")}
                placeholder={t("templates.panel.defaultValuePlaceholder", "Default value")}
                name={`fields.${idx}.defaultValue`}
              />
              {type !== "email" && type !== "password" && (
                <InputSelect
                  label={t("templates.panel.direction")}
                  name={`fields.${idx}.dir`}
                  placeholder={t("templates.panel.auto", "Auto")}
                  options={DIRECTION_OPTIONS}
                />
              )}
              {(type === "text" || type === "number" || type === "email") && (
                <InputSelect
                  label={t("templates.panel.inputMode")}
                  name={`fields.${idx}.inputMode`}
                  placeholder={t("templates.panel.default", "Default")}
                  options={INPUT_MODE_OPTIONS}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
