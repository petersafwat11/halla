import React from "react";
import styles from "./inputGroup.module.css";
import Image from "next/image";
import { get, useFormContext } from "react-hook-form";

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
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext() || {};

  const formValue = watch?.(name);
  const formError = get(errors, name)?.message;
  const isControlled = inputValue !== undefined && onChange !== undefined;

  if (isControlled) {
    return (
      <div className={styles.input_group}>
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
        <div className={styles.input_container}>
          <input
            className={externalError ? styles.input_error : styles.input}
            type={type}
            placeholder={placeholder}
            name={name}
            value={inputValue}
            onChange={onChange}
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
          type={type}
          placeholder={placeholder}
          name={name}
          {...(register &&
            register(name, {
              required: required && "This field is required",
              minLength: {
                value: 9,
                message: "Phone number must be 9 digits",
              },
            }))}
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
