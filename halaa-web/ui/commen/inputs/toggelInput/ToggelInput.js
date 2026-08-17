"use client";
import React from "react";
import { useFormContext, useController } from "react-hook-form";
import styles from "./toggelInput.module.css";

const ToggleInput = ({
  name,
  label,
  disabled = false,
  description,
  ...rest
}) => {
  const { control } = useFormContext();

  const {
    field: { value, onChange },
    fieldState: { error },
  } = useController({
    name,
    control,
    defaultValue: false,
  });

  const handleToggle = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.toggleWrapper}>
        <div className={styles.toggleContainer}>
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={value}
            onChange={handleToggle}
            disabled={disabled}
            className={styles.hiddenInput}
            {...rest}
          />
          <div
            className={`${styles.toggle} ${value ? styles.active : ""} ${
              disabled ? styles.disabled : ""
            }`}
            onClick={handleToggle}
            role="switch"
            aria-checked={value}
            aria-labelledby={name}
          >
            <div className={styles.toggleSlider}></div>
          </div>
        </div>
        <div className={styles.labelSection}>
          <label className={styles.label} htmlFor={name}>
            {label}
          </label>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.error}>{error.message}</p>
        </div>
      )}
    </div>
  );
};

export default ToggleInput;
