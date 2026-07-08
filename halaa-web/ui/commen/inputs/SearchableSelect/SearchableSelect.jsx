"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./SearchableSelect.module.css";

/**
 * SearchableSelect - A dropdown with search functionality
 * Can be used for single or multi-select
 */
const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "اختر...",
  searchPlaceholder = "ابحث...",
  label,
  disabled = false,
  loading = false,
  multiple = false,
  allOption = null, // { value: "", label: "الكل" }
  noOptionsMessage = "لا توجد خيارات",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get display value
  const getDisplayValue = () => {
    if (multiple) {
      if (!value || value.length === 0) return placeholder;
      if (value.length === 1) {
        const selected = options.find((opt) => opt.value === value[0]);
        return selected?.label || placeholder;
      }
      return `${value.length} محدد`;
    } else {
      if (!value && value !== 0) return placeholder;
      if (allOption && value === allOption.value) return allOption.label;
      const selected = options.find((opt) => opt.value === value);
      return selected?.label || placeholder;
    }
  };

  // Handle option click
  const handleOptionClick = (optionValue) => {
    if (multiple) {
      const currentValues = value || [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  // Handle all option click (for single select)
  const handleAllClick = () => {
    if (multiple) {
      onChange([]);
    } else {
      onChange(allOption?.value || "");
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  // Check if option is selected
  const isSelected = (optionValue) => {
    if (multiple) {
      return (value || []).includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div className={`${styles.container} ${className}`} ref={containerRef}>
      {label && <label className={styles.label}>{label}</label>}

      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ""} ${
          disabled ? styles.disabled : ""
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={styles.value}>
          {loading ? "جاري التحميل..." : getDisplayValue()}
        </span>
        <svg
          className={`${styles.arrow} ${isOpen ? styles.arrowUp : ""}`}
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

      {isOpen && !disabled && (
        <div className={styles.dropdown}>
          {/* Search Input */}
          <div className={styles.searchContainer}>
            <svg
              className={styles.searchIcon}
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
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className={styles.optionsList}>
            {/* All Option */}
            {allOption && (
              <button
                type="button"
                className={`${styles.option} ${
                  !value ||
                  (multiple && value.length === 0) ||
                  (!multiple && value === allOption.value)
                    ? styles.selected
                    : ""
                }`}
                onClick={handleAllClick}
              >
                <span>{allOption.label}</span>
                {(!value ||
                  (multiple && value.length === 0) ||
                  (!multiple && value === allOption.value)) && (
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
            )}

            {/* Filtered Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`${styles.option} ${
                    isSelected(option.value) ? styles.selected : ""
                  }`}
                  onClick={() => handleOptionClick(option.value)}
                >
                  {multiple && (
                    <span
                      className={`${styles.checkbox} ${
                        isSelected(option.value) ? styles.checked : ""
                      }`}
                    >
                      {isSelected(option.value) && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M8.33341 2.5L3.75008 7.08333L1.66675 5"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  )}
                  <span>{option.label}</span>
                  {!multiple && isSelected(option.value) && (
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
              ))
            ) : (
              <div className={styles.noOptions}>{noOptionsMessage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
