"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./serviceDetailsSection.module.css";
import { useTranslation } from "react-i18next";
import UploadFileStandalone from "@/ui/commen/inputs/uploadFile/UploadFileStandalone";
import { useRegions, useCitiesByRegion, useDistrictsByCity } from "@/hooks/reactQueryHooks/useLocations";

const ServiceDetailsEditForm = ({
  data,
  onSave,
  onClose,
  isLoading,
  setIsLoading,
}) => {
  const { t } = useTranslation("vendorSettings");
  const districtsRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    description: data?.serviceDescription || "",
    nationalId: data?.nationalId || "",
  });
  const [nationalIdImages, setNationalIdImages] = useState([]);
  const [commercialRecordImages, setCommercialRecordImages] = useState([]);

  // Location state
  const [selectedRegion, setSelectedRegion] = useState(
    data?.serviceLocation?.regionId || ""
  );
  const [selectedCity, setSelectedCity] = useState(
    data?.serviceLocation?.cityId || ""
  );
  const [selectedDistricts, setSelectedDistricts] = useState(
    data?.serviceLocation?.districtIds || []
  );
  const [isDistrictsOpen, setIsDistrictsOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");

  const existingNationalIdImages = data?.nationalIdImage
    ? [data.nationalIdImage]
    : [];
  const existingCommercialImages = data?.commercialRecordImage
    ? [data.commercialRecordImage]
    : [];

  // Use location hooks
  const { data: regionsData } = useRegions();
  const { data: citiesData } = useCitiesByRegion(selectedRegion);
  const { data: districtsData } = useDistrictsByCity(selectedCity);

  const regions = regionsData?.data?.regions || [];
  const cities = citiesData?.data?.cities || [];
  const districts = districtsData?.data?.districts || [];

  // Close districts dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        districtsRef.current &&
        !districtsRef.current.contains(event.target)
      ) {
        setIsDistrictsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDistrictToggle = (districtId) => {
    setSelectedDistricts((prev) =>
      prev.includes(districtId)
        ? prev.filter((id) => id !== districtId)
        : [...prev, districtId]
    );
  };

  const filteredDistricts = districts.filter((district) => {
    const name = district.name_en || district.name_ar;
    return name?.toLowerCase().includes(districtSearch.toLowerCase());
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave({
          serviceDescription: formData.description,
          nationalId: formData.nationalId,
          nationalIdImage: nationalIdImages,
          commercialRecordImage: commercialRecordImages,
          serviceLocation: {
            regionId: selectedRegion,
            cityId: selectedCity,
            districtIds: selectedDistricts,
          },
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.editFormContainer}>
      {/* Header */}
      <div className={styles.editFormHeader}>
        <button
          onClick={onClose}
          className={styles.editFormCloseButton}
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 22L22 2"
              stroke="#292D32"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 22L2 2"
              stroke="#292D32"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className={styles.editFormTitle}>{t("serviceDetails.title")}</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.editForm}>
        {/* Document Images Row */}
        <div className={styles.editFormRow}>
          <div className={styles.editFormField}>
            <label className={styles.editFormLabel}>
              {t("serviceDetails.otherLicenses")}
            </label>
            <UploadFileStandalone
              value={nationalIdImages}
              onChange={setNationalIdImages}
              multiple={false}
              acceptImages={true}
              existingImages={existingNationalIdImages}
              placeholder={t(
                "serviceDetails.uploadLicense",
                "Upload license image"
              )}
            />
          </div>

          <div className={styles.editFormField}>
            <label className={styles.editFormLabel}>
              {t("serviceDetails.commercialRegister")}
            </label>
            <UploadFileStandalone
              value={commercialRecordImages}
              onChange={setCommercialRecordImages}
              multiple={false}
              acceptImages={true}
              existingImages={existingCommercialImages}
              placeholder={t(
                "serviceDetails.uploadCommercial",
                "Upload commercial record"
              )}
            />
          </div>
        </div>

        {/* National ID */}
        <div className={styles.editFormField}>
          <label className={styles.editFormLabel}>
            {t("serviceDetails.nationalIdLabel")}
          </label>
          <input
            type="text"
            className={styles.editFormInput}
            value={formData.nationalId}
            onChange={(e) =>
              setFormData({ ...formData, nationalId: e.target.value })
            }
            placeholder={t(
              "serviceDetails.nationalIdPlaceholder",
              "Enter national ID"
            )}
          />
        </div>

        {/* Description */}
        <div className={styles.editFormField}>
          <label className={styles.editFormLabel}>
            {t("serviceDetails.serviceDescription")}
          </label>
          <textarea
            className={styles.editFormTextarea}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder={t("serviceDetails.serviceDescriptionPlaceholder")}
            rows={4}
          />
        </div>

        {/* Location Section */}
        <div className={styles.editFormSection}>
          <label className={styles.editFormSectionLabel}>
            {t("serviceDetails.serviceLocation", "Service Location")}
          </label>

          <div className={styles.editFormRow}>
            {/* Region */}
            <div className={styles.editFormField}>
              <label className={styles.editFormLabel}>
                {t("serviceDetails.region", "Region")}
              </label>
              <select
                className={styles.editFormSelect}
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedCity("");
                  setSelectedDistricts([]);
                }}
              >
                <option value="">
                  {t("serviceDetails.selectRegion", "Select region")}
                </option>
                {regions.map((region) => (
                  <option key={region.region_id} value={region.region_id}>
                    {region.name_en || region.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className={styles.editFormField}>
              <label className={styles.editFormLabel}>
                {t("serviceDetails.city", "City")}
              </label>
              <select
                className={styles.editFormSelect}
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedDistricts([]);
                }}
                disabled={!selectedRegion}
              >
                <option value="">
                  {t("serviceDetails.allCities", "All cities")}
                </option>
                {cities.map((city) => (
                  <option key={city.city_id} value={city.city_id}>
                    {city.name_en || city.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* Districts */}
            <div className={styles.editFormField} ref={districtsRef}>
              <label className={styles.editFormLabel}>
                {t("serviceDetails.districts", "Districts")}
              </label>
              {selectedCity ? (
                <div className={styles.multiSelectContainer}>
                  <div
                    className={styles.multiSelectTrigger}
                    onClick={() => setIsDistrictsOpen(!isDistrictsOpen)}
                  >
                    <span>
                      {selectedDistricts.length > 0
                        ? t("serviceDetails.selectedCount", "{{count}} selected", { count: selectedDistricts.length })
                        : t("serviceDetails.selectDistricts", "Select districts")}
                    </span>
                    <span className={styles.arrow}>
                      {isDistrictsOpen ? "▲" : "▼"}
                    </span>
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
                          <label
                            key={district.district_id}
                            className={styles.optionItem}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDistricts.includes(
                                district.district_id
                              )}
                              onChange={() =>
                                handleDistrictToggle(district.district_id)
                              }
                            />
                            <span>
                              {district.name_en || district.name_ar}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={styles.editFormSelect}
                  style={{ color: "#9ca3af", cursor: "not-allowed" }}
                >
                  {t("serviceDetails.selectCityFirst", "Select city first")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.editFormFooter}>
          <button
            type="submit"
            className={styles.editFormSubmitBtn}
            disabled={isLoading}
          >
            {isLoading
              ? t("buttons.saving", "Saving...")
              : t("buttons.save", "Save")}
          </button>
          <button
            type="button"
            className={styles.editFormCancelBtn}
            onClick={onClose}
            disabled={isLoading}
          >
            {t("buttons.cancel", "Cancel")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceDetailsEditForm;
