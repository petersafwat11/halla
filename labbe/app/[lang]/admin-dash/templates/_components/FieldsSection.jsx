"use client";
import React, { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
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

export default function FieldsSection({ fieldTypes, t }) {
  const { control, watch } = useFormContext();
  const fieldsArr = useFieldArray({ control, name: "fields" });
  const fields = watch("fields") || [];
  const [expandedField, setExpandedField] = useState(null);

  return (
    <div className={styles.fieldsContainer}>
      <div className={styles.fieldsHeader}>
        <span className={styles.fieldCount}>{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
        <Button
          type="button"
          variant="primary"
          size="small"
          title={`+ ${t("templates.panel.addField")}`}
          onClick={() => {
            const idx = fieldsArr.fields.length;
            fieldsArr.append({
              key: `field_${idx + 1}`,
              type: "text",
              labelEn: t("templates.panel.newFieldLabelEn", "New field"),
              labelAr: t("templates.panel.newFieldLabelAr", "حقل جديد"),
              required: false,
            });
            setExpandedField(idx);
          }}
        />
      </div>

      {fieldsArr.fields.map((f, idx) => {
        const type = watch(`fields.${idx}.type`);
        const isExpanded = expandedField === idx;

        return (
          <div key={f.id} className={`${styles.fieldCard} ${isExpanded ? styles.expanded : ""}`}>
            <div
              className={styles.fieldCardHeader}
              onClick={() => setExpandedField(isExpanded ? null : idx)}
            >
              <div className={styles.fieldCardHeaderLeft}>
                <span className={styles.fieldIndex}>{idx + 1}</span>
                <div className={styles.fieldCardInfo}>
                  <span className={styles.fieldCardKey}>{watch(`fields.${idx}.key`) || `field_${idx + 1}`}</span>
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
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <Button
                  type="button"
                  variant="danger"
                  size="small"
                  title={t("templates.panel.delete")}
                  onClick={(e) => {
                    e.stopPropagation();
                    fieldsArr.remove(idx);
                    if (expandedField === idx) setExpandedField(null);
                  }}
                />
              </div>
            </div>

            {isExpanded && (
              <div className={styles.fieldCardBody}>
                {/* Identity */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Identity</h4>
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
                      placeholder="Select type"
                      options={FIELD_TYPE_OPTIONS}
                    />
                  </div>
                </div>

                {/* Labels */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Labels</h4>
                  <div className={styles.formGrid}>
                    <InputGroup
                      label={t("templates.panel.labelEn")}
                      placeholder="Field name in English"
                      name={`fields.${idx}.labelEn`}
                      required
                    />
                    <InputGroup
                      label={t("templates.panel.labelAr")}
                      placeholder="اسم الحقل بالعربية"
                      name={`fields.${idx}.labelAr`}
                      required
                    />
                  </div>
                </div>

                {/* Placeholders */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Placeholders</h4>
                  <div className={styles.formGrid}>
                    <InputGroup
                      label={t("templates.panel.placeholderEn")}
                      placeholder="Enter placeholder (EN)"
                      name={`fields.${idx}.placeholderEn`}
                    />
                    <InputGroup
                      label={t("templates.panel.placeholderAr")}
                      placeholder="أدخل النص التوضيحي (AR)"
                      name={`fields.${idx}.placeholderAr`}
                    />
                  </div>
                </div>

                {/* Validation */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Validation</h4>
                  <div className={styles.validationRow}>
                    <div className={styles.toggleWrapper}>
                      <ToggleInput
                        name={`fields.${idx}.required`}
                        label={t("templates.panel.required")}
                      />
                    </div>
                    {(type === "text" || type === "textarea" || type === "email" || type === "password") && (
                      <div className={styles.formGrid}>
                        <InputGroup
                          label={t("templates.panel.minLen")}
                          placeholder="0"
                          name={`fields.${idx}.minLength`}
                          type="number"
                        />
                        <InputGroup
                          label={t("templates.panel.maxLen")}
                          placeholder="Unlimited"
                          name={`fields.${idx}.maxLength`}
                          type="number"
                        />
                      </div>
                    )}
                    {type === "number" && (
                      <div className={styles.formGrid3}>
                        <InputGroup
                          label={t("templates.panel.minVal")}
                          placeholder="Min"
                          name={`fields.${idx}.min`}
                          type="number"
                        />
                        <InputGroup
                          label={t("templates.panel.maxVal")}
                          placeholder="Max"
                          name={`fields.${idx}.max`}
                          type="number"
                        />
                        <InputGroup
                          label={t("templates.panel.step")}
                          placeholder="Step"
                          name={`fields.${idx}.step`}
                          type="number"
                        />
                      </div>
                    )}
                    {type === "textarea" && (
                      <div className={styles.formField}>
                        <InputGroup
                          label={t("templates.panel.rows")}
                          placeholder="4"
                          name={`fields.${idx}.rows`}
                          type="number"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced */}
                <div className={styles.configGroup}>
                  <h4 className={styles.configGroupTitle}>Advanced</h4>
                  <div className={styles.formGrid}>
                    <InputGroup
                      label={t("templates.panel.defaultValue")}
                      placeholder="Default value"
                      name={`fields.${idx}.defaultValue`}
                    />
                    {type !== "email" && type !== "password" && (
                      <InputSelect
                        label={t("templates.panel.direction")}
                        name={`fields.${idx}.dir`}
                        placeholder="Auto"
                        options={DIRECTION_OPTIONS}
                      />
                    )}
                    {(type === "text" || type === "number" || type === "email") && (
                      <InputSelect
                        label={t("templates.panel.inputMode")}
                        name={`fields.${idx}.inputMode`}
                        placeholder="Default"
                        options={INPUT_MODE_OPTIONS}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {fields.length === 0 && (
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="24" rx="4" stroke="#c28e5c" strokeWidth="2"/>
            <path d="M16 20H32M16 28H24" stroke="#c28e5c" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className={styles.emptyText}>No fields added yet</p>
          <p className={styles.emptySubtext}>Click "Add Field" to start building your template</p>
        </div>
      )}
    </div>
  );
}
