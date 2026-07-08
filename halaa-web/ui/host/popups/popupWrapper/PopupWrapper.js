import React from "react";
import styles from "./popupWrapper.module.css";

const PopupWrapper = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default PopupWrapper;
