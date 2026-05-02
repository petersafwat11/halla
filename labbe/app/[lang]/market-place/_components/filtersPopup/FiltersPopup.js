"use client";
import React, { useEffect, useRef } from "react";
import styles from "./filtersPopup.module.css";
import SearchableSelect from "@/ui/commen/inputs/SearchableSelect/SearchableSelect";

const RATING_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "4", label: "4+ نجوم" },
  { value: "3", label: "3+ نجوم" },
  { value: "2", label: "2+ نجوم" },
];

const FiltersPopup = ({
  isOpen,
  onClose,
  filters,
  updateFilter,
  regions,
  cities,
  districts,
  loadingCities,
  loadingDistricts,
  activeFilters,
  onRemoveFilter,
  onReset,
}) => {
  const popupRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }

      if (e.key === "Tab") {
        const focusableElements = popupRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Lock body scroll
    document.body.style.overflow = "hidden";

    // Focus first element after animation
    const timer = setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 100);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="filters-title">
      <div className={styles.popup} ref={popupRef}>
        <div className={styles.header}>
          <button
            ref={firstFocusableRef}
            className={styles.backButton}
            onClick={onClose}
            aria-label="Close filters"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18"
                stroke="#2C2C2C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="#2C2C2C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 id="filters-title" className={styles.title}>الفلاتر</h2>
          <button
            ref={lastFocusableRef}
            className={styles.closeBtn}
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18"
                stroke="#2C2C2C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="#2C2C2C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {/* Region */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>المنطقة</label>
            <select
              className={styles.select}
              value={filters.regionId}
              onChange={(e) => updateFilter("regionId", e.target.value)}
            >
              <option value="">جميع المناطق</option>
              {regions.map((region) => (
                <option key={region.region_id} value={region.region_id}>
                  {region.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          {filters.regionId && (
            <div className={styles.filterGroup}>
              <SearchableSelect
                label="المدينة"
                options={cities.map((city) => ({
                  value: city.city_id,
                  label: city.name_ar,
                }))}
                value={filters.cityId}
                onChange={(val) => updateFilter("cityId", val)}
                placeholder="جميع المدن"
                searchPlaceholder="ابحث عن مدينة..."
                loading={loadingCities}
                allOption={{ value: "", label: "جميع المدن" }}
              />
            </div>
          )}

          {/* District */}
          {filters.cityId && districts.length > 0 && (
            <div className={styles.filterGroup}>
              <SearchableSelect
                label="الحي"
                options={districts.map((d) => ({
                  value: d.district_id,
                  label: d.name_ar,
                }))}
                value={filters.districtIds}
                onChange={(val) => updateFilter("districtIds", val)}
                placeholder="جميع الأحياء"
                searchPlaceholder="ابحث عن حي..."
                loading={loadingDistricts}
                multiple={true}
                allOption={{ value: "", label: "جميع الأحياء" }}
              />
            </div>
          )}

          {/* Price Range */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>نطاق السعر (ريال)</label>
            <div className={styles.priceRange}>
              <input
                type="number"
                className={styles.priceInput}
                placeholder="من"
                value={filters.minPrice}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                min="0"
              />
              <span className={styles.priceSeparator}>-</span>
              <input
                type="number"
                className={styles.priceInput}
                placeholder="إلى"
                value={filters.maxPrice}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Rating */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>التقييم</label>
            <select
              className={styles.select}
              value={filters.minRating}
              onChange={(e) => updateFilter("minRating", e.target.value)}
            >
              {RATING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className={styles.activeFiltersSection}>
              <h3 className={styles.sectionTitle}>المرشحات النشطة</h3>
              <div className={styles.filterTags}>
                {activeFilters.map((filter, index) => (
                  <div key={index} className={styles.filterTag}>
                    <span>{filter.label}</span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => onRemoveFilter(filter.name)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M10.5 3.5L3.5 10.5"
                          stroke="#929FA5"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.5 10.5L3.5 3.5"
                          stroke="#929FA5"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={onReset}>
            إعادة تعيين
          </button>
          <button className={styles.applyBtn} onClick={onClose}>
            تطبيق
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersPopup;
