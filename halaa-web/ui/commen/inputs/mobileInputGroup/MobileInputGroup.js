import React from "react";
import styles from "./inputGroup.module.css";
import { FiPhone } from "react-icons/fi";
import { get, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  clampPhoneInput,
  getPhoneMaxLength,
  isValidSaudiMobile,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";

const MobileInputGroup = ({
  label,
  placeholder,
  type,
  name,
  value: inputValue,
  onChange,
  required,
  error: externalError,
  hintMessage,
}) => {
  const { t } = useTranslation("common");
  const formContext = useFormContext();
  const {
    register,
    formState: { errors } = {},
    watch,
    setValue,
  } = formContext || {};

  const formValue = watch?.(name);
  const formError = errors ? get(errors, name)?.message : undefined;
  const isControlled = inputValue !== undefined && onChange !== undefined;

  // This is a product-wide token, not localized copy.
  const resolvedPlaceholder = DEFAULT_PHONE_PLACEHOLDER;

  if (isControlled) {
    const handleControlledChange = (e) => {
      const clamped = clampPhoneInput(e.target.value);
      e.target.value = clamped;
      onChange(e);
    };

    return (
      <div className={styles.input_group}>
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        <div className={styles.input_container}>
          <span className={styles.code} dir="ltr">
            <FiPhone size={20} aria-hidden="true" />
            <span className={styles.code_text}>+966</span>
          </span>
          <input
            id={name}
            className={externalError ? styles.input_error : styles.input}
            type={type || "tel"}
            placeholder={resolvedPlaceholder}
            name={name}
            value={inputValue}
            maxLength={getPhoneMaxLength(inputValue)}
            inputMode="numeric"
            autoComplete="tel"
            onChange={handleControlledChange}
          />
        </div>
        {externalError && (
          <div className={styles.error_container}>
            <p className={styles.error}>{externalError}</p>
          </div>
        )}
        {hintMessage && <p className={styles.hint}>{hintMessage}</p>}
      </div>
    );
  }

  const currentVal = formValue || "";
  const regProps = register
    ? register(name, {
        required: required && t("validation.required"),
        validate: {
          // The input already clamps to Saudi shapes, so anything that is
          // non-empty but not a valid Saudi mobile is a half-typed number.
          // Catching it here replaces an opaque backend 400 with an inline
          // message on the field that is actually wrong.
          saudiMobile: (value) => {
            const raw = typeof value === "string" ? value.trim() : "";
            if (!raw) return true; // emptiness is the `required` rule's job
            return isValidSaudiMobile(raw) || t("validation.invalidSaudiPhone");
          },
        },
        onChange: (e) => {
          const clamped = clampPhoneInput(e.target.value);
          e.target.value = clamped;
          if (setValue) {
            setValue(name, clamped, { shouldValidate: true });
          }
        },
      })
    : {};

  return (
    <div className={styles.input_group}>
      <label className={styles.label} htmlFor={name}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.input_container}>
        <span className={styles.code} dir="ltr">
          <FiPhone size={20} aria-hidden="true" />
          <span className={styles.code_text}>+966</span>
        </span>
        <input
          id={name}
          className={
            formError || externalError ? styles.input_error : styles.input
          }
          type={type || "tel"}
          placeholder={resolvedPlaceholder}
          name={name}
          maxLength={getPhoneMaxLength(currentVal)}
          inputMode="numeric"
          autoComplete="tel"
          {...regProps}
        />
      </div>
      {(externalError || formError) && (
        <div className={styles.error_container}>
          <p className={styles.error}>{externalError || formError}</p>
        </div>
      )}
      {hintMessage && <p className={styles.hint}>{hintMessage}</p>}
    </div>
  );
};

export default MobileInputGroup;
