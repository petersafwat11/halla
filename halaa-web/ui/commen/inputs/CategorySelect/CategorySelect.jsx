"use client";
import React, { useState, useRef, useEffect } from "react";
// Reuse the SearchableSelect look so the category field matches the app's
// other dropdowns exactly.
import styles from "../SearchableSelect/SearchableSelect.module.css";

/**
 * CategorySelect — a creatable, searchable single-select for free-text
 * category labels. Pick an existing label or type a new one (the typed query
 * becomes the value). `options` is a string[] of existing labels. Optional:
 * the "none" row clears the value.
 */
const CategorySelect = ({
  value = "",
  onChange,
  options = [],
  label,
  placeholder = "بدون تصنيف",
  searchPlaceholder = "ابحث أو اكتب تصنيفاً",
  noneLabel = "بدون تصنيف",
  createLabel = (q) => `إنشاء «${q}»`,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim();
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  const exactExists = options.some((o) => o.toLowerCase() === q.toLowerCase());

  const select = (val) => {
    onChange?.(val);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className={styles.container} ref={ref}>
      {label && <label className={styles.label}>{label}</label>}

      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ""} ${disabled ? styles.disabled : ""}`}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={styles.value} style={!value ? { color: "#9ca3af" } : undefined}>
          {value || placeholder}
        </span>
        <svg className={`${styles.arrow} ${isOpen ? styles.arrowUp : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className={styles.dropdown}>
          <div className={styles.searchContainer}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.25 12.5C10.1495 12.5 12.5 10.1495 12.5 7.25C12.5 4.35051 10.1495 2 7.25 2C4.35051 2 2 4.35051 2 7.25C2 10.1495 4.35051 12.5 7.25 12.5Z" stroke="#929FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.9624 10.9625L13.9999 14" stroke="#929FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q) {
                  e.preventDefault();
                  select(q);
                }
              }}
              autoFocus
            />
          </div>

          <div className={styles.optionsList}>
            <button type="button" className={`${styles.option} ${!value ? styles.selected : ""}`} onClick={() => select("")}>
              <span>{noneLabel}</span>
            </button>

            {filtered.map((o) => (
              <button
                type="button"
                key={o}
                className={`${styles.option} ${value === o ? styles.selected : ""}`}
                onClick={() => select(o)}
              >
                <span>{o}</span>
              </button>
            ))}

            {q && !exactExists && (
              <button type="button" className={styles.option} onClick={() => select(q)}>
                <span>＋ {createLabel(q)}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelect;
