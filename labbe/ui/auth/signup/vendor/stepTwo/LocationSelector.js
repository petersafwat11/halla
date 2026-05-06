"use client";
import React, { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import styles from "./locationSelector.module.css";
import { useRegions, useCitiesByRegion, useDistrictsByCity } from "@/hooks/useLocations";

const LocationSelector = () => {
  const { t, i18n } = useTranslation("signup");
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const isArabic = i18n.language === "ar";

  // Local state for dropdown data
  const [districtsSearchQuery, setDistrictsSearchQuery] = useState("");
  const districtsDropdownRef = useRef(null);

  // React Query hooks for locations
  const { data: regionsData, isLoading: regionsLoading } = useRegions();
  const { data: citiesData, isLoading: citiesLoading } = useCitiesByRegion(
    watch("serviceData.serviceLocation.regionId")
  );
  const { data: districtsData, isLoading: districtsLoading } = useDistrictsByCity(
    watch("serviceData.serviceLocation.cityId")
  );

  // Extract arrays from response data
  const regions = regionsData?.data?.regions || [];
  const cities = citiesData?.data?.cities || [];
  const districts = districtsData?.data?.districts || [];

  // State for districts multi-select dropdown
  const [isDistrictsDropdownOpen, setIsDistrictsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        districtsDropdownRef.current &&
        !districtsDropdownRef.current.contains(event.target)
      ) {
        setIsDistrictsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Watch form values
  const selectedRegionId = watch("serviceData.serviceLocation.regionId");
  const selectedCityId = watch("serviceData.serviceLocation.cityId");
  const coverageType = watch("serviceData.serviceLocation.coverageType");

  // Handle region names when data loads
  useEffect(() => {
    const region = regions.find((r) => r.region_id === selectedRegionId);
    if (region) {
      setValue("serviceData.serviceLocation.regionNameAr", region.name_ar);
      setValue("serviceData.serviceLocation.regionNameEn", region.name_en);
    }
  }, [selectedRegionId, regions, setValue]);

  // Handle city names when data loads
  useEffect(() => {
    const city = cities.find((c) => c.city_id === selectedCityId);
    if (city) {
      setValue("serviceData.serviceLocation.cityNameAr", city.name_ar);
      setValue("serviceData.serviceLocation.cityNameEn", city.name_en);
    }
  }, [selectedCityId, cities, setValue]);

  // Handle region selection
  const handleRegionChange = (value) => {
    const regionId = parseInt(value);
    setValue("serviceData.serviceLocation.regionId", regionId);
    setValue("serviceData.serviceLocation.cityId", null);
    setValue("serviceData.serviceLocation.districtIds", []);
    setValue("serviceData.serviceLocation.districtNames", []);
    setValue("serviceData.serviceLocation.coverageType", "region");
  };

  // Handle city selection
  const handleCityChange = (value) => {
    if (value === "all") {
      setValue("serviceData.serviceLocation.cityId", null);
      setValue("serviceData.serviceLocation.coverageType", "region");
      setValue("serviceData.serviceLocation.districtIds", []);
      setValue("serviceData.serviceLocation.districtNames", []);
    } else {
      const cityId = parseInt(value);
      setValue("serviceData.serviceLocation.cityId", cityId);
      setValue("serviceData.serviceLocation.coverageType", "city");
      setValue("serviceData.serviceLocation.districtIds", []);
      setValue("serviceData.serviceLocation.districtNames", []);
    }
  };

  // Handle district selection (multi-select)
  const handleDistrictToggle = (districtId) => {
    const currentDistrictIds =
      watch("serviceData.serviceLocation.districtIds") || [];
    const currentDistrictNames =
      watch("serviceData.serviceLocation.districtNames") || [];

    if (districtId === "all") {
      setValue("serviceData.serviceLocation.districtIds", []);
      setValue("serviceData.serviceLocation.districtNames", []);
      setValue("serviceData.serviceLocation.coverageType", "city");
      return;
    }

    const district = districts.find((d) => d.district_id === districtId);
    const isSelected = currentDistrictIds.includes(districtId);

    if (isSelected) {
      // Remove district
      const newIds = currentDistrictIds.filter((id) => id !== districtId);
      const newNames = currentDistrictNames.filter(
        (d) => d.nameAr !== district?.name_ar
      );
      setValue("serviceData.serviceLocation.districtIds", newIds);
      setValue("serviceData.serviceLocation.districtNames", newNames);
      setValue(
        "serviceData.serviceLocation.coverageType",
        newIds.length > 0 ? "districts" : "city"
      );
    } else {
      // Add district
      setValue("serviceData.serviceLocation.districtIds", [
        ...currentDistrictIds,
        districtId,
      ]);
      setValue("serviceData.serviceLocation.districtNames", [
        ...currentDistrictNames,
        { nameAr: district?.name_ar, nameEn: district?.name_en },
      ]);
      setValue("serviceData.serviceLocation.coverageType", "districts");
    }
  };

  // Format options for select
  const regionOptions = regions.map((r) => ({
    value: r.region_id.toString(),
    label: isArabic ? r.name_ar : r.name_en,
  }));

  const cityOptions = [
    {
      value: "all",
      label: t("signupForm.vendor.serviceData.location.allCities"),
    },
    ...cities.map((c) => ({
      value: c.city_id.toString(),
      label: isArabic ? c.name_ar : c.name_en,
    })),
  ];

  const selectedDistrictIds =
    watch("serviceData.serviceLocation.districtIds") || [];

  return (
    <div className={styles.container}>
      {/* Region Select */}
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
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors?.serviceData?.serviceLocation?.regionId && (
          <span className={styles.error}>
            {errors.serviceData.serviceLocation.regionId.message}
          </span>
        )}
      </div>

      {/* City Select - only show if region is selected */}
      {selectedRegionId && (
        <div className={styles.selectGroup}>
          <label className={styles.label}>
            {t("signupForm.vendor.serviceData.location.city", "المدينة")}
          </label>
          <select
            className={styles.select}
            value={
              selectedCityId === null ? "all" : selectedCityId?.toString() || ""
            }
            onChange={(e) => handleCityChange(e.target.value)}
            disabled={citiesLoading}
          >
            {citiesLoading ? (
              <option value="">
                {t("signupForm.vendor.serviceData.location.loading")}
              </option>
            ) : (
              cityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {/* District Multi-Select Dropdown - only show if city is selected (not "all") */}
      {selectedCityId && selectedCityId !== "all" && districts.length > 0 && (
        <div className={styles.selectGroup}>
          <label className={styles.label}>
            {t("signupForm.vendor.serviceData.location.districts", "الأحياء")}
          </label>
          <div className={styles.multiSelectWrapper} ref={districtsDropdownRef}>
            {/* Dropdown trigger */}
            <div
              className={styles.multiSelectTrigger}
              onClick={() =>
                setIsDistrictsDropdownOpen(!isDistrictsDropdownOpen)
              }
            >
              <span className={styles.multiSelectValue}>
                {selectedDistrictIds.length === 0
                  ? t("signupForm.vendor.serviceData.location.allDistricts")
                  : t("signupForm.vendor.serviceData.location.districtsSelected", { count: selectedDistrictIds.length })}
              </span>
              <svg
                className={`${styles.dropdownArrow} ${isDistrictsDropdownOpen ? styles.dropdownArrowOpen : ""
                  }`}
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

            {/* Dropdown content */}
            {isDistrictsDropdownOpen && (
              <div className={styles.multiSelectDropdown}>
                {/* Search input */}
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={t("signupForm.vendor.serviceData.location.searchDistrict")}
                    value={districtsSearchQuery}
                    onChange={(e) => setDistrictsSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Options list */}
                <div className={styles.optionsList}>
                  {/* All districts option */}
                  <label className={styles.districtOption}>
                    <input
                      type="checkbox"
                      checked={selectedDistrictIds.length === 0}
                      onChange={() => handleDistrictToggle("all")}
                    />
                    <span>
                      {t("signupForm.vendor.serviceData.location.allDistricts")}
                    </span>
                  </label>

                  {/* Filtered districts */}
                  {districts
                    .filter((district) => {
                      if (!districtsSearchQuery) return true;
                      const searchLower = districtsSearchQuery.toLowerCase();
                      return (
                        district.name_ar?.includes(districtsSearchQuery) ||
                        district.name_en?.toLowerCase().includes(searchLower)
                      );
                    })
                    .map((district) => (
                      <label
                        key={district.district_id}
                        className={styles.districtOption}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDistrictIds.includes(
                            district.district_id
                          )}
                          onChange={() =>
                            handleDistrictToggle(district.district_id)
                          }
                        />
                        <span>
                          {isArabic ? district.name_ar : district.name_en}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coverage Summary */}
      {selectedRegionId && (
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>
            {t("signupForm.vendor.serviceData.location.coverageLabel")}
          </span>
          <span className={styles.summaryValue}>
            {coverageType === "region" &&
              t("signupForm.vendor.serviceData.location.entireRegion")}
            {coverageType === "city" &&
              t("signupForm.vendor.serviceData.location.entireCity")}
            {coverageType === "districts" &&
              t("signupForm.vendor.serviceData.location.selectedDistricts", { count: selectedDistrictIds.length })}
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
