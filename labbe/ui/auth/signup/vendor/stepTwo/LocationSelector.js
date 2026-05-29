"use client";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./locationSelector.module.css";
import { useRegions, useCitiesByRegion, useDistrictsByCity } from "@/hooks/locations";
import { useLocationFormSelection } from "./useLocationFormSelection";
import DistrictsMultiSelect from "./DistrictsMultiSelect";

const LocationSelector = () => {
  const { t, i18n } = useTranslation("signup");
  const { setValue, watch, formState: { errors } } = useFormContext();
  const isArabic = i18n.language === "ar";

  const { data: regionsData, isLoading: regionsLoading, error: regionsError } = useRegions();
  const { data: citiesData, isLoading: citiesLoading, error: citiesError } = useCitiesByRegion(watch("serviceData.serviceLocation.regionId"));
  const { data: districtsData, isLoading: districtsLoading, error: districtsError } = useDistrictsByCity(watch("serviceData.serviceLocation.cityId"));

  const regions = regionsData?.data?.regions || [];
  const cities = citiesData?.data?.cities || [];
  const districts = districtsData?.data?.districts || [];

  const {
    isDistrictsDropdownOpen,
    setIsDistrictsDropdownOpen,
    selectedRegionId,
    selectedCityId,
    handleRegionChange,
    handleCityChange,
    handleDistrictToggle,
  } = useLocationFormSelection({ watch, setValue, regions, cities });

  const coverageType = watch("serviceData.serviceLocation.coverageType");
  const selectedDistrictIds = watch("serviceData.serviceLocation.districtIds") || [];

  const renderError = (error) => {
    if (!error) return null;
    return <span className={styles.error}>{t("common.errors.locationLoadFailed", "Couldn't load locations")}</span>;
  };

  const regionOptions = regions.map((r) => ({
    value: r.region_id.toString(),
    label: isArabic ? r.name_ar : r.name_en,
  }));

  const cityOptions = [
    { value: "all", label: t("signupForm.vendor.serviceData.location.allCities") },
    ...cities.map((c) => ({
      value: c.city_id.toString(),
      label: isArabic ? c.name_ar : c.name_en,
    })),
  ];

  return (
    <div className={styles.container}>
      {renderError(regionsError) && <div className={styles.selectGroup}>{renderError(regionsError)}</div>}
      <div className={styles.selectGroup}>
        <label className={styles.label}>
          {t("signupForm.vendor.serviceData.location.region", "المنطقة")} *
        </label>
        <select
          className={styles.select}
          value={selectedRegionId || ""}
          onChange={(e) => handleRegionChange(e.target.value)}
          disabled={regionsLoading}
        >
          <option value="">
            {regionsLoading
              ? t("signupForm.vendor.serviceData.location.loading")
              : t("signupForm.vendor.serviceData.location.selectRegion")}
          </option>
          {regionOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {errors?.serviceData?.serviceLocation?.regionId && (
          <span className={styles.error}>{errors.serviceData.serviceLocation.regionId.message}</span>
        )}
      </div>

      {selectedRegionId && (
        <div className={styles.selectGroup}>
          <label className={styles.label}>
            {t("signupForm.vendor.serviceData.location.city", "المدينة")}
          </label>
          <select
            className={styles.select}
            value={selectedCityId === null ? "all" : selectedCityId?.toString() || ""}
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={citiesLoading}
          >
            {citiesLoading ? (
              <option value="">{t("signupForm.vendor.serviceData.location.loading")}</option>
            ) : (
              cityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))
            )}
          </select>
        </div>
      )}

      {selectedCityId && selectedCityId !== "all" && districts.length > 0 && (
        <div className={styles.selectGroup}>
          <label className={styles.label}>
            {t("signupForm.vendor.serviceData.location.districts", "الأحياء")}
          </label>
          <DistrictsMultiSelect
            districts={districts}
            selectedDistrictIds={selectedDistrictIds}
            onToggleDistrict={(id) => handleDistrictToggle(id, districts)}
            isDropdownOpen={isDistrictsDropdownOpen}
            onToggleDropdown={setIsDistrictsDropdownOpen}
          />
        </div>
      )}

      {selectedRegionId && (
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>
            {t("signupForm.vendor.serviceData.location.coverageLabel")}
          </span>
          <span className={styles.summaryValue}>
            {coverageType === "region" && t("signupForm.vendor.serviceData.location.entireRegion")}
            {coverageType === "city" && t("signupForm.vendor.serviceData.location.entireCity")}
            {coverageType === "districts" && t("signupForm.vendor.serviceData.location.selectedDistricts", { count: selectedDistrictIds.length })}
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
