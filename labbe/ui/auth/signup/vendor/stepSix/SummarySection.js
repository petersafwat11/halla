import React from "react";
import SectionTitle from "../../../../commen/title/SectionTitle";
import styles from "./stepSix.module.css";

const SummarySection = ({ title, icon, data, fields }) => {
  if (!data) {
    return null;
  }

  const hasContent = fields.some((field) => {
    const value = field.key
      .split(".")
      .reduce((o, i) => (o ? o[i] : undefined), data);
    return (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    );
  });

  if (!hasContent) {
    return null;
  }

  return (
    <div className={styles.section}>
      <SectionTitle title={title} icon={icon} height={24} width={24} />
      <div className={styles.summary_content}>
        {fields.map((field) => {
          const fieldValue = field.key
            .split(".")
            .reduce((o, i) => (o ? o[i] : undefined), data);

          if (
            fieldValue === undefined ||
            fieldValue === null ||
            (typeof fieldValue === "string" && fieldValue.trim() === "") ||
            (Array.isArray(fieldValue) && fieldValue.length === 0)
          ) {
            return null;
          }

          let displayValue = fieldValue;
          if (Array.isArray(fieldValue)) {
            if (field.options) {
              displayValue = fieldValue
                .map((val) => {
                  const option = field.options.find((opt) => opt.value === val);
                  return option ? option.label : val;
                })
                .join(", ");
            } else {
              displayValue = fieldValue
                .map((item) => item.label || item)
                .join(", ");
            }
          }

          return (
            <div key={field.key} className={styles.summary_item}>
              <span className={styles.summary_label}>{field.label}:</span>
              <span className={styles.summary_value}>
                {field.type === "file" || field.type === "logo"
                  ? (Array.isArray(fieldValue) ? fieldValue : [fieldValue]).map(
                      (file, index) =>
                        file instanceof File ? (
                          <img
                            key={index}
                            src={URL.createObjectURL(file)}
                            alt={field.label}
                            className={styles.logo_preview}
                          />
                        ) : (
                          <span key={index}>{file.name || "file"}</span>
                        )
                    )
                  : displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SummarySection;
