"use client";
import React from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./filters.module.css";

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
  const { t } = useTranslation("marketplace");

  const ratingOptions = [
    { value: "", label: t("filters.ratingAll") },
    { value: "4", label: t("filters.rating4") },
    { value: "3", label: t("filters.rating3") },
    { value: "2", label: t("filters.rating2") },
  ];

  return (
    <div className={styles.container}>
      {/* Filters and Search Row */}
      <div className={styles.filtersRow}>
        {/* Desktop Filters */}
        <div className={styles.desktopFilters}>
          {/* Region */}
          <div className={styles.filterItem}>
            <FilterSelect
              label={t("filters.region")}
              value={filters.regionId}
              onChange={(e) => updateFilter("regionId", e.target.value)}
              options={[
                { value: "", label: t("filters.allRegions") },
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
              label={t("filters.city")}
              value={filters.cityId}
              onChange={(e) => updateFilter("cityId", e.target.value)}
              options={[
                { value: "", label: t("filters.allCities") },
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
              label={t("filters.district")}
              value={filters.districtIds}
              onChange={(e) => updateFilter("districtIds", e.target.value)}
              options={[
                { value: "", label: t("filters.allDistricts") },
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
            <label className={styles.filterLabel}>{t("filters.price")}</label>
            <div className={styles.priceRange}>
              <input
                className={styles.filterInput}
                type="number"
                placeholder={t("filters.priceFrom")}
                value={filters.minPrice || ""}
                onChange={(e) => updateFilter("minPrice", e.target.value)}
                min="0"
              />
              <span className={styles.priceSeparator}>-</span>
              <input
                className={styles.filterInput}
                type="number"
                placeholder={t("filters.priceTo")}
                value={filters.maxPrice || ""}
                onChange={(e) => updateFilter("maxPrice", e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Rating */}
          <div className={styles.filterItem}>
            <FilterSelect
              label={t("filters.rating")}
              value={filters.minRating}
              onChange={(e) => updateFilter("minRating", e.target.value)}
              options={ratingOptions}
            />
          </div>
        </div>

        {/* Mobile Filters Button */}
        <button
          className={styles.mobileFiltersBtn}
          onClick={onOpenFiltersPopup}
        >
          <Search size={20} />
          <span>{t("filters.title")}</span>
        </button>

        {/* Search */}
        <div className={styles.search}>
          <Search size={20} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className={styles.activeFilters}>
          <span className={styles.resultsCount}>
            {t("filters.resultsCount", {
              count: resultsCount.toLocaleString(),
              total: totalCount?.toLocaleString(),
            })}
          </span>
          <div className={styles.filterTags}>
            {activeFilters.map((filter) => (
              <div key={filter.name} className={styles.filterTag}>
                <span>{filter.label}</span>
                <X
                  size={12}
                  onClick={() => onRemoveFilter(filter.name)}
                  className={styles.removeIcon}
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
