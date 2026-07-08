import React from "react";
import styles from "./confirmBtn.module.css";

const ConfirmBtn = ({
  text,
  clickHandler,
  active,
  disabled,
  type = "submit",
}) => {
  return (
    <button
      type={type}
      onClick={clickHandler}
      className={
        active && !disabled ? styles.confirm_btn : styles.confirm_btn_disabled
      }
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default ConfirmBtn;
