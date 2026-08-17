"use client";
import React from "react";
import styles from "./textarea.module.css";
import Image from "next/image";
import { get, useFormContext } from "react-hook-form";

const TextArea = ({
  label,
  placeholder,
  name,
  iconPath,
  hintMessage,
  validations,
  prefixText,
  required,
  error: externalError,
  value: inputValue,
  onChange,
  maxLength,
  rows = 4,
}) => {
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors || {};
  const watch = formContext?.watch;

  const formError = get(errors, name)?.message;
  const formValue = watch?.(name);
  const isControlled = inputValue !== undefined && onChange !== undefined;

  return (
    <div className={styles.input_group}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.input_container}>
        {prefixText && <span className={styles.prefix_text}>{prefixText}</span>}
        <textarea
          className={
            formError || externalError
              ? styles.input_error
              : prefixText
                ? `${styles.input} ${styles.input_with_prefix}`
                : styles.input
          }
          placeholder={placeholder}
          name={name}
          rows={rows}
          maxLength={maxLength}
          {...(isControlled
            ? { value: inputValue, onChange }
            : register
              ? register(name)
              : {})}
        />
        {iconPath && (
          <Image
            className={styles.icon}
            src={`/svg/${iconPath}`}
            alt="icon"
            width={24}
            height={24}
          />
        )}
      </div>
      {(formError || externalError) && (
        <div className={styles.error_container}>
          <p className={styles.error}>{formError || externalError}</p>
        </div>
      )}

      {hintMessage && !formError && !externalError && (
        <p className={styles.hint}>{hintMessage}</p>
      )}

      {maxLength && (
        <div className={styles.charCount}>
          {(isControlled ? inputValue?.length : formValue?.length) || 0} /{" "}
          {maxLength}
        </div>
      )}

      {validations && validations.length > 0 && (
        <div className={styles.validation_rules}>
          {validations.map((rule, index) => (
            <p
              key={index}
              className={`${styles.validation_rule} ${
                rule.isValid ? styles.valid : ""
              }`}
            >
              {rule.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default TextArea;
