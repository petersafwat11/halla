"use client";

import React from "react";
import styles from "./TemplatesPageContent.module.css";

export default function TemplateIncludeInactiveToggle({ checked, onChange, label }) {
  return (
    <label className={styles.toggleLabel}>
      <div
        className={`${styles.toggle} ${checked ? styles.toggleActive : ""}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <div className={styles.toggleSlider} />
      </div>
      <span className={styles.toggleText}>{label}</span>
    </label>
  );
}
