import React from "react";
import styles from "./inputGroup.module.css";
import Image from "next/image";
import { get, useFormContext } from "react-hook-form";
import {
  clampPhoneInput,
  getPhoneMaxLength,
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

  const resolvedPlaceholder = placeholder || DEFAULT_PHONE_PLACEHOLDER;

  if (isControlled) {
    const handleControlledChange = (e) => {
      const clamped = clampPhoneInput(e.target.value);
      e.target.value = clamped;
      onChange(e);
    };

    return (
      <div className={styles.input_group}>
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        <div className={styles.input_container}>
          <input
            className={externalError ? styles.input_error : styles.input}
            type={type || "tel"}
            placeholder={resolvedPlaceholder}
            name={name}
            value={inputValue}
            maxLength={getPhoneMaxLength(inputValue)}
            onChange={handleControlledChange}
          />
          <Image
            src={"/svg/auth/country-code.svg"}
            alt="country-code"
            width={104}
            height={48}
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
        required: required && "This field is required",
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
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.input_container}>
        <input
          className={
            formError || externalError ? styles.input_error : styles.input
          }
          type={type || "tel"}
          placeholder={resolvedPlaceholder}
          name={name}
          maxLength={getPhoneMaxLength(currentVal)}
          {...regProps}
        />
        <Image
          src={"/svg/auth/country-code.svg"}
          alt="country-code"
          width={104}
          height={48}
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
