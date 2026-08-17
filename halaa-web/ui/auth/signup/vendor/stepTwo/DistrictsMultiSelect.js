"use client";
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./locationSelector.module.css";

const DistrictsMultiSelect = ({
  districts,
  selectedDistrictIds,
  onToggleDistrict,
  isDropdownOpen,
  onToggleDropdown,
}) => {
  const { t, i18n } = useTranslation("signup");
  const isArabic = i18n.language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onToggleDropdown]);

  const filteredDistricts = districts.filter((district) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      district.name_ar?.includes(searchQuery) ||
      district.name_en?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className={styles.multiSelectWrapper} ref={dropdownRef}>
      <div
        className={styles.multiSelectTrigger}
        onClick={() => onToggleDropdown(!isDropdownOpen)}
      >
        <span className={styles.multiSelectValue}>
          {selectedDistrictIds.length === 0
            ? t("signupForm.vendor.serviceData.location.allDistricts")
            : t("signupForm.vendor.serviceData.location.districtsSelected", { count: selectedDistrictIds.length })}
        </span>
        <svg
          className={`${styles.dropdownArrow} ${isDropdownOpen ? styles.dropdownArrowOpen : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </div>

      {isDropdownOpen && (
        <div className={styles.multiSelectDropdown}>
          <div className={styles.searchInputWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t("signupForm.vendor.serviceData.location.searchDistrict")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className={styles.optionsList}>
            <label className={styles.districtOption}>
              <input
                type="checkbox"
                checked={selectedDistrictIds.length === 0}
                onChange={() => onToggleDistrict("all")}
              />
              <span>{t("signupForm.vendor.serviceData.location.allDistricts")}</span>
            </label>

            {filteredDistricts.map((district) => (
              <label key={district.district_id} className={styles.districtOption}>
                <input
                  type="checkbox"
                  checked={selectedDistrictIds.includes(district.district_id)}
                  onChange={() => onToggleDistrict(district.district_id)}
                />
                <span>{isArabic ? district.name_ar : district.name_en}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DistrictsMultiSelect;
