import React from "react";
import SectionTitle from "../../../../commen/title/SectionTitle";
import styles from "./stepSix.module.css";

const SummarySection = ({ title, icon, data, fields }) => {
  // Guard against undefined/null data
  if (!data || typeof data !== "object") {
    return null;
  }

  const hasContent = fields.some((field) => {
    const fieldValue = data?.[field.key];
    return (
      fieldValue !== undefined &&
      fieldValue !== null &&
      (typeof fieldValue !== "string" || fieldValue.trim() !== "") &&
      (!Array.isArray(fieldValue) || fieldValue.length > 0)
    );
  });

  if (!hasContent) {
    return null;
  }

  return (
    <div className={styles.section}>
      <SectionTitle title={title} icon={icon} height={24} width={24} />
      <div className={styles.summaryGrid}>
        {fields.map((field) => {
          const fieldValue = data?.[field.key];
          if (
            fieldValue === undefined ||
            fieldValue === null ||
            (typeof fieldValue === "string" && fieldValue === "") ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
          )
            return null;

          let displayValue = fieldValue;
          if (Array.isArray(fieldValue)) {
            displayValue =
              fieldValue.length > 0 ? fieldValue.join(", ") : "None selected";
          }

          return (
            <div key={field.key} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{field.label}</span>
              <span className={styles.summaryValue}>
                {field.type === "color" ? (
                  <div className={styles.color_preview}>
                    <div
                      className={styles.color_swatch}
                      style={{ backgroundColor: fieldValue }}
                    />
                    <span>{fieldValue}</span>
                  </div>
                ) : field.type === "logo" || field.type === "image" ? (
                  fieldValue instanceof File ? (
                    <img
                      src={URL.createObjectURL(fieldValue)}
                      alt={field.label}
                      className={styles.logo_preview}
                    />
                  ) : typeof fieldValue === "string" ? (
                    <img
                      src={fieldValue}
                      alt={field.label}
                      className={styles.logo_preview}
                    />
                  ) : fieldValue && fieldValue[0] instanceof File ? (
                    <img
                      src={URL.createObjectURL(fieldValue[0])}
                      alt={field.label}
                      className={styles.logo_preview}
                    />
                  ) : (
                    displayValue
                  )
                ) : (
                  displayValue
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SummarySection;
