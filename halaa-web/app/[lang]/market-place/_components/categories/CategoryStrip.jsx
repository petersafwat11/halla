"use client";

import React from "react";
import { getCategoryIcon } from "../categoryIcons";
import styles from "./categories.module.css";

/**
 * Horizontal category selector with canonical icons and a gold active state.
 * `categories` is the backend category list ({ key, nameAr, nameEn }).
 */
export default function CategoryStrip({ categories, language, activeKey, onSelect, allLabel, ariaLabel }) {
  const isAr = language === "ar";
  const items = [{ key: "all", label: allLabel }, ...categories.map((c) => ({ key: c.key, label: isAr ? c.nameAr : c.nameEn }))];

  return (
    <div className={styles.strip} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const Icon = getCategoryIcon(item.key);
        const active = activeKey === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.chip} ${active ? styles.active : ""}`}
            onClick={() => onSelect(item.key)}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
