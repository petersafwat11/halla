"use client";
import React, { useState, useEffect } from "react";
import styles from "./inputGroup.module.css";
import Image from "next/image";
import { get, useFormContext } from "react-hook-form";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

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

  // Handle password visibility toggle
  useEffect(() => {
    if (type === "password") {
      setInputType(showPassword ? "text" : "password");
    } else {
      setInputType(type);
    }
  }, [type, showPassword]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine input classes based on icons and prefix
  const getInputClasses = () => {
    let classes = [styles.input];

    if (formError || externalError) {
      classes.push(styles.inputError);
    }

    if (disabled) {
      classes.push(styles.inputDisabled);
    }

    // Add padding classes based on icons and prefix
    if (prefixText) {
      classes.push(styles.inputWithPrefix);
    }

    if (iconPath) {
      classes.push(styles.inputWithRightIcon);
    }

    if (type === "password") {
      classes.push(styles.inputWithPasswordToggle);
    }

    // Combine prefix and icons
    if (prefixText && (iconPath || type === "password")) {
      classes.push(styles.inputWithPrefixAndRightIcon);
    }

    return classes.join(" ");
  };

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
          className={getInputClasses()}
          type={inputType}
          placeholder={placeholder}
          name={name}
          disabled={disabled}
          maxLength={maxLength}
          {...(isControlled 
            ? { value: inputValue, onChange } 
            : register ? register(name) : {}
          )}
          style={{
            // Email/password are intrinsically LTR tokens; everything else
            // inherits the page direction instead of forcing RTL (English
            // pages previously rendered their text fields right-aligned).
            direction:
              type === "email" || type === "password" ? "ltr" : undefined,
          }}
        />

        {iconPath && (
          <Image
            className={styles.icon}
            src={`/svg/${iconPath}`}
            alt="icon"
            width={20}
            height={20}
          />
        )}

        {type === "password" && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <IoEyeOffOutline className={styles.passwordIcon} />
            ) : (
              <IoEyeOutline className={styles.passwordIcon} />
            )}
          </button>
        )}
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
