"use client";
import React from "react";
import { createPortal } from "react-dom";
import styles from "./popupWrapper.module.css";

const PopupWrapper = ({ isOpen, onClose, children }) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>, document.body
  );
};

export default PopupWrapper;
