"use client";
import  { useState } from "react";
import styles from "./inputGroup.module.css";
import { get, useFormContext } from "react-hook-form";

const InputGroup = ({
  label,
  placeholder,
  type,
  name,
  iconPath,
  hintMessage,
  validations,
  prefixText,
  required,
  error: externalError,
  value: inputValue,
  onChange,
  disabled = false,
  maxLength,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [inputType, setInputType] = useState(type);

  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext() || {};

  const formError = get(errors, name)?.message;
  const formValue = watch?.(name);
  const isControlled = inputValue !== undefined && onChange !== undefined;

  return (
    <div className={styles.inputGroup}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputContainer}>
        {prefixText && <span className={styles.prefixText}>{prefixText}</span>}
        <input
          id={name}
          placeholder={placeholder}
          name={name}
          disabled={disabled}
          maxLength={maxLength}
          {...(isControlled 
            ? { value: inputValue, onChange } 
            : register ? register(name) : {}
          )}
          style={{
            direction: type === "email" || type === "password" ? "ltr" : "rtl",
          }}
        />

      </div>
      {(formError || externalError) && (
        <div className={styles.errorContainer}>
          <p className={styles.error}>{formError || externalError}</p>
        </div>
      )}

      {hintMessage && !formError && !externalError && (
        <p className={styles.hint}>{hintMessage}</p>
      )}

      {maxLength && (
        <div className={styles.charCount}>
          {(isControlled ? inputValue?.length : formValue?.length) || 0} / {maxLength}
        </div>
      )}

      {validations && validations.length > 0 && (
        <div className={styles.validationRules}>
          {validations.map((rule, index) => (
            <div
              key={index}
              className={`${styles.validationRule} ${
                rule.isValid ? styles.validationRuleValid : ""
              }`}
            >
              <span className={styles.validationText}>{rule.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InputGroup;
