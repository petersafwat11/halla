"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./TemplatesPageContent.module.css";

export default function TemplateCategoryFilter({
  categories,
  value,
  onChange,
  t,
  lang,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = categories.filter((c) => {
    const name = lang === "ar" ? c.nameAr : c.nameEn;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedLabel = value
    ? categories.find((c) => c.code === value)?.[lang === "ar" ? "nameAr" : "nameEn"] || ""
    : "";

  return (
    <div className={styles.filterSelect} ref={ref}>
      <button
        type="button"
        className={`${styles.filterButton} ${isOpen ? styles.filterButtonOpen : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.filterButtonText}>
          {selectedLabel || t("templates.allCategories", "كل الفئات")}
        </span>
        <svg
          className={`${styles.filterArrow} ${isOpen ? styles.filterArrowUp : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && (
        <div className={styles.filterDropdown}>
          <div className={styles.filterDropdownSearch}>
            <svg
              className={styles.filterDropdownSearchIcon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M7.25 12.5C10.1495 12.5 12.5 10.1495 12.5 7.25C12.5 4.35051 10.1495 2 7.25 2C4.35051 2 2 4.35051 2 7.25C2 10.1495 4.35051 12.5 7.25 12.5Z"
                stroke="#929FA5"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.9624 10.9625L13.9999 14"
                stroke="#929FA5"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder={t("templates.searchCategories", "البحث عن فئة")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.filterDropdownInput}
              autoFocus
            />
          </div>
          <div className={styles.filterDropdownOptions}>
            <button
              type="button"
              className={`${styles.filterOption} ${!value ? styles.filterOptionSelected : ""}`}
              onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }}
            >
              {t("templates.allCategories", "كل الفئات")}
              {!value && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13.3334 4L6.00008 11.3333L2.66675 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            {options.map((c) => {
              const name = lang === "ar" ? c.nameAr : c.nameEn;
              const isSelected = value === c.code;
              return (
                <button
                  key={c._id || c.code}
                  type="button"
                  className={`${styles.filterOption} ${isSelected ? styles.filterOptionSelected : ""}`}
                  onClick={() => { onChange(c.code); setIsOpen(false); setSearch(""); }}
                >
                  {name}
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M13.3334 4L6.00008 11.3333L2.66675 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
            {options.length === 0 && (
              <div className={styles.filterDropdownEmpty}>
                {t("templates.noCategoriesFound", "لا توجد فئات")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
