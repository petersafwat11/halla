"use client";

import React, { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import Button from "@/ui/commen/button/Button";
import FieldRow from "./FieldRow";
import styles from "./FieldsSection.module.css";

export default function FieldsSection({ fieldTypes, t }) {
  const { control, watch } = useFormContext();
  const fieldsArr = useFieldArray({ control, name: "fields" });
  const fields = watch("fields") || [];
  const [expandedField, setExpandedField] = useState(null);

  return (
    <div className={styles.fieldsContainer}>
      <div className={styles.fieldsHeader}>
        <span className={styles.fieldCount}>
          {fields.length} {t("templates.panel.fieldsCount", "field(s)")}
        </span>
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
        const fieldKey = watch(`fields.${idx}.key`);
        const isExpanded = expandedField === idx;
        return (
          <FieldRow
            key={f.id}
            idx={idx}
            type={type}
            fieldKey={fieldKey}
            isExpanded={isExpanded}
            onToggle={() => setExpandedField(isExpanded ? null : idx)}
            onRemove={() => {
              fieldsArr.remove(idx);
              if (expandedField === idx) setExpandedField(null);
            }}
            t={t}
          />
        );
      })}

      {fields.length === 0 && (
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="24" rx="4" stroke="#c28e5c" strokeWidth="2" />
            <path d="M16 20H32M16 28H24" stroke="#c28e5c" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className={styles.emptyText}>
            {t("templates.panel.noFields", "No fields added yet")}
          </p>
          <p className={styles.emptySubtext}>
            {t("templates.panel.addFieldHint", 'Click "Add Field" to start building your template')}
          </p>
        </div>
      )}
    </div>
  );
}
