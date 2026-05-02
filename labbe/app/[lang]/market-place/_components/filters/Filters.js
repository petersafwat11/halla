"use client";
import React from "react";
import { Search, X } from "lucide-react";
import styles from "./filters.module.css";

const RATING_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "4", label: "4+ نجوم" },
  { value: "3", label: "3+ نجوم" },
  { value: "2", label: "2+ نجوم" },
];

const FilterSelect = ({ label, value, onChange, options, disabled = false }) => (
  <div className={styles.filterSelectGroup}>
    <label className={styles.filterLabel}>{label}</label>
    <select
      className={styles.filterSelect}
      value={Array.isArray(value) ? value[0] || "" : value || ""}
      onChange={onChange}
      disabled={disabled}
    >
      {options.map((opt, i) => (
        <option key={i} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Filters = ({
  searchQuery,
  onSearch,
  filters,
  updateFilter,
  regions,
  cities,
  districts,
  loadingCities,
  loadingDistricts,
  activeFilters,
  resultsCount,
  totalCount,
  onRemoveFilter,
  onOpenFiltersPopup,
}) => {
  return (
    <div className={styles.container}>
      {/* Filters and Search Row - filters at start, search at end */}
      <div className={styles.filtersRow}>
        {/* Desktop Filters */}
        <div className={styles.desktopFilters}>
          {/* Region */}
          <div className={styles.filterItem}>
            <FilterSelect
              label="المنطقة"
              value={filters.regionId}
              onChange={(e) => updateFilter("regionId", e.target.value)}
              options={[
                { value: "", label: "جميع المناطق" },
                ...(Array.isArray(regions) ? regions : []).map((region) => ({
                  value: region.region_id,
                  label: region.name_ar,
                })),
              ]}
            />
          </div>

          {/* City */}
          <div className={styles.filterItem}>
            <FilterSelect
              label="المدينة"
              value={filters.cityId}
              onChange={(e) => updateFilter("cityId", e.target.value)}
              options={[
                { value: "", label: "جميع المدن" },
                ...(Array.isArray(cities) ? cities : []).map((city) => ({
                  value: city.city_id,
                  label: city.name_ar,
                })),
              ]}
              disabled={!filters.regionId || loadingCities}
            />
          </div>

          {/* District */}
          <div className={styles.filterItem}>
            <FilterSelect
              label="الحي"
              value={filters.districtIds}
              onChange={(e) => updateFilter("districtIds", e.target.value)}
              options={[
                { value: "", label: "جميع الأحياء" },
                ...(Array.isArray(districts) ? districts : []).map((d) => ({
                  value: d.district_id,
                  label: d.name_ar,
                })),
              ]}
              disabled={!filters.cityId || loadingDistricts}
            />
          </div>

          {/* Price Range */}
          <div className={styles.filterItem}>
            <label className={styles.filterLabel}>السعر</label>
            <div className={styles.priceRange}>
              <input
                className={styles.filterInput}
                type="number"
                placeholder="من"
                value={filters.minPrice || ""}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                min="0"
              />
              <span className={styles.priceSeparator}>-</span>
              <input
                className={styles.filterInput}
                type="number"
                placeholder="إلى"
                value={filters.maxPrice || ""}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Rating */}
          <div className={styles.filterItem}>
            <FilterSelect
              label="التقييم"
              value={filters.minRating}
              onChange={(e) => updateFilter("minRating", e.target.value)}
              options={RATING_OPTIONS}
            />
          </div>
        </div>

        {/* Mobile Filters Button */}
        <button
          className={styles.mobileFiltersBtn}
          onClick={onOpenFiltersPopup}
        >
          <Search size={20} />
          <span>الفلاتر</span>
        </button>

        {/* Search */}
        <div className={styles.search}>
          <Search size={20} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="ابحث عن أي شيء ..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className={styles.activeFilters}>
          <span className={styles.resultsCount}>
            {resultsCount.toLocaleString()} من {totalCount?.toLocaleString()} نتيجة
          </span>
          <div className={styles.filterTags}>
            {activeFilters.map((filter) => (
              <div key={filter.name} className={styles.filterTag}>
                <span>{filter.label}</span>
                <X
                  size={12}
                  onClick={() => onRemoveFilter(filter.name)}
                  style={{ cursor: "pointer" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Filters;
