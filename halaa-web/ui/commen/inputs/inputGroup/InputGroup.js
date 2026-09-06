"use client";
import React, { useState, useEffect } from "react";
import styles from "./inputGroup.module.css";
import AuthIcon from "../../icons/AuthIcon";
import { get, useFormContext } from "react-hook-form";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import {
  clampPhoneInput,
  DEFAULT_PHONE_PLACEHOLDER,
} from "@halaa/shared/utils/phone";

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
  direction,
  labelDirection,
  sanitize,
  inputMode,
  pattern,
  lang,
}) => {
  const { t, i18n } = useTranslation("common");
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
  // Password alignment follows the selected UI language, even when revealed.
  const resolvedDirection = type === "password" ? i18n.dir() : direction ||
    (["email", "tel", "url"].includes(type) ? "ltr" : i18n.dir());
  const resolvedPlaceholder = type === "email"
    ? "ahmed@gmail.com"
    : type === "tel"
      ? DEFAULT_PHONE_PLACEHOLDER
      : placeholder;
  const effectiveSanitize = sanitize || (type === "tel" ? clampPhoneInput : undefined);

  const controlledChange = (event) => {
    if (effectiveSanitize) event.target.value = effectiveSanitize(event.target.value);
    onChange(event);
  };

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
        <label className={styles.label} dir={labelDirection || i18n.dir()} htmlFor={name}>
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
          placeholder={resolvedPlaceholder}
          name={name}
          disabled={disabled}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          lang={lang}
          dir={resolvedDirection}
          aria-invalid={Boolean(formError || externalError)}
          {...(isControlled 
            ? { value: inputValue, onChange: controlledChange }
            : register ? register(name) : {}
          )}
          onInput={effectiveSanitize ? (event) => {
            const sanitized = effectiveSanitize(event.currentTarget.value);
            if (sanitized !== event.currentTarget.value) {
              event.currentTarget.value = sanitized;
            }
          } : undefined}
          style={{
            // Use the original field type so visibility does not change alignment.
            direction: resolvedDirection,
            textAlign: "start",
          }}
        />

        {iconPath && (
          <AuthIcon
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
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
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
