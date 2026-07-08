"use client";
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import styles from "./serviceDetailsSection.module.css";

const LocationFieldsRow = ({
  regions,
  cities,
  districts,
  selectedRegion,
  setSelectedRegion,
  selectedCity,
  setSelectedCity,
  selectedDistricts,
  setSelectedDistricts,
}) => {
  const { t, i18n } = useTranslation("vendorSettings");
  const [isDistrictsOpen, setIsDistrictsOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const districtsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (districtsRef.current && !districtsRef.current.contains(event.target)) {
        setIsDistrictsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDistrictToggle = (districtId) => {
    setSelectedDistricts((prev) =>
      prev.includes(districtId) ? prev.filter((id) => id !== districtId) : [...prev, districtId]
    );
  };

  const filteredDistricts = districts.filter((district) => {
    const searchLower = districtSearch.toLowerCase();
    return (
      district.name_ar?.toLowerCase().includes(searchLower) ||
      district.name_en?.toLowerCase().includes(searchLower)
    );
  });

  const getLocaleName = (item) => (i18n.language === "ar" ? item.name_ar : item.name_en);

  return (
    <div className={styles.editFormRow}>
      <div className={styles.editFormField}>
        <label className={styles.editFormLabel}>{t("serviceDetails.region", "Region")}</label>
        <select
          className={styles.editFormSelect}
          value={selectedRegion}
          onChange={(e) => {
            setSelectedRegion(e.target.value);
            setSelectedCity("");
            setSelectedDistricts([]);
          }}
        >
          <option value="">{t("serviceDetails.selectRegion", "Select region")}</option>
          {regions.map((region) => (
            <option key={region.region_id} value={region.region_id}>{getLocaleName(region)}</option>
          ))}
        </select>
      </div>

      <div className={styles.editFormField}>
        <label className={styles.editFormLabel}>{t("serviceDetails.city", "City")}</label>
        <select
          className={styles.editFormSelect}
          value={selectedCity}
          onChange={(e) => {
            setSelectedCity(e.target.value);
            setSelectedDistricts([]);
          }}
          disabled={!selectedRegion}
        >
          <option value="">{t("serviceDetails.allCities", "All cities")}</option>
          {cities.map((city) => (
            <option key={city.city_id} value={city.city_id}>{getLocaleName(city)}</option>
          ))}
        </select>
      </div>

      <div className={styles.editFormField} ref={districtsRef}>
        <label className={styles.editFormLabel}>{t("serviceDetails.districts", "Districts")}</label>
        {selectedCity ? (
          <div className={styles.multiSelectContainer}>
            <div className={styles.multiSelectTrigger} onClick={() => setIsDistrictsOpen(!isDistrictsOpen)}>
              <span>
                {selectedDistricts.length > 0
                  ? t("serviceDetails.selectedCount", "{{count}} selected", { count: selectedDistricts.length })
                  : t("serviceDetails.selectDistricts", "Select districts")}
              </span>
              <span className={styles.arrow}>{isDistrictsOpen ? "▲" : "▼"}</span>
            </div>
            {isDistrictsOpen && (
              <div className={styles.multiSelectDropdown}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder={t("serviceDetails.search", "Search...")}
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className={styles.optionsList}>
                  {filteredDistricts.slice(0, 50).map((district) => (
                    <label key={district.district_id} className={styles.optionItem}>
                      <input
                        type="checkbox"
                        checked={selectedDistricts.includes(district.district_id)}
                        onChange={() => handleDistrictToggle(district.district_id)}
                      />
                      <span>{getLocaleName(district)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`${styles.editFormSelect} ${styles.disabledLabel}`}>
            {t("serviceDetails.selectCityFirst", "Select city first")}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationFieldsRow;
