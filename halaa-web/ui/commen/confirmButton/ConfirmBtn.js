import React from "react";
import styles from "./confirmBtn.module.css";

const ConfirmBtn = ({
  text,
  clickHandler,
  active,
  disabled,
  type = "submit",
  className = "",
  isLoading = false,
}) => {
  return (
    <button
      type={type}
      onClick={clickHandler}
      className={`${
        active && !disabled && !isLoading
          ? styles.confirm_btn
          : styles.confirm_btn_disabled
      } ${className}`.trim()}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <span className={styles.spinner} aria-label="Loading..." />
      ) : (
        text
      )}
    </button>
  );
};

export default ConfirmBtn;
