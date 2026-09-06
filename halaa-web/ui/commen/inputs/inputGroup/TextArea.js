"use client";
import React from "react";
import styles from "./textarea.module.css";
import AuthIcon from "../../icons/AuthIcon";
import { get, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
  direction,
  labelDirection,
  sanitize,
  lang,
}) => {
  const { i18n } = useTranslation();
  const localeDirection = i18n.dir();
  const formContext = useFormContext();
  const register = formContext?.register;
  const errors = formContext?.formState?.errors || {};
  const watch = formContext?.watch;

  const formError = get(errors, name)?.message;
  const formValue = watch?.(name);
  const isControlled = inputValue !== undefined && onChange !== undefined;
  const resolvedDirection = direction || localeDirection;
  const controlledChange = (event) => {
    if (sanitize) event.target.value = sanitize(event.target.value);
    onChange(event);
  };

  return (
    <div className={styles.input_group}>
      {label && (
        <label className={styles.label} dir={labelDirection || localeDirection} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.input_container} dir={resolvedDirection}>
        {prefixText && <span className={styles.prefix_text}>{prefixText}</span>}
        <textarea
          id={name}
          dir={resolvedDirection}
          lang={lang}
          className={[
            styles.input,
            (formError || externalError) && styles.input_error,
            prefixText && styles.input_with_prefix,
            iconPath && styles.input_with_icon,
          ].filter(Boolean).join(" ")}
          aria-invalid={Boolean(formError || externalError)}
          placeholder={placeholder}
          name={name}
          rows={rows}
          maxLength={maxLength}
          {...(isControlled
            ? { value: inputValue, onChange: controlledChange }
            : register
              ? register(name)
              : {})}
          onInput={sanitize ? (event) => {
            const sanitized = sanitize(event.currentTarget.value);
            if (sanitized !== event.currentTarget.value) {
              event.currentTarget.value = sanitized;
            }
          } : undefined}
        />
        {iconPath && (
          <AuthIcon
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
          <p className={styles.error} dir={localeDirection}>{formError || externalError}</p>
        </div>
      )}

      {hintMessage && !formError && !externalError && (
        <p className={styles.hint} dir={localeDirection}>{hintMessage}</p>
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
