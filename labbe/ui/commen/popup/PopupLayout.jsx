"use client";
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import styles from "./popup.module.css";

/**
 * PopupLayout - Flexible popup wrapper
 * @param {"medium"|"auto"|"full"} size - "medium" (default): fixed 580px for standard forms
 *                                        "auto": shrinks to fit child content
 *                                        "full": fixed 80%/90% for large editors (e.g. templateForm)
 */
function PopupLayout({ children, isOpen, onClose, size = "medium" }) {
  const [show, setShow] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.style.overflow = "hidden";

      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      }, 0);
    } else {
      setTimeout(() => {
        setShow(false);
        document.body.style.overflow = "";
      }, 300);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!show && !isOpen) return null;

  const contentClassName =
    size === "full"
      ? styles.popupLayoutContent
      : size === "auto"
      ? styles.popupLayoutContentAuto
      : styles.popupLayoutContentMedium;

  return ReactDOM.createPortal(
    <div onClick={onClose} className={styles.popupLayout}>
      <div
        ref={contentRef}
        onClick={(e) => e.stopPropagation()}
        className={contentClassName}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default PopupLayout;
