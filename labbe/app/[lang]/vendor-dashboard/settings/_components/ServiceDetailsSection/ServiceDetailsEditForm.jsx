"use client";
import React, { useState } from "react";
import styles from "./serviceDetailsSection.module.css";
import { useTranslation } from "react-i18next";
import EditFormHeader from "./EditFormHeader";
import DocumentUploadsRow from "./DocumentUploadsRow";
import LocationFieldsRow from "./LocationFieldsRow";
import { useRegions, useCitiesByRegion, useDistrictsByCity } from "@/hooks/locations";
import { validateForm, serviceDetailsSchema } from "@/utils/schemas/vendorSettings";

const ServiceDetailsEditForm = ({ data, onSave, onClose, isLoading, setIsLoading }) => {
  const { t } = useTranslation("vendorSettings");

  const [formData, setFormData] = useState({
    description: data?.serviceDescription || "",
    nationalId: data?.nationalId || "",
  });
  const [errors, setErrors] = useState({});
  const [nationalIdImages, setNationalIdImages] = useState([]);
  const [commercialRecordImages, setCommercialRecordImages] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState(data?.serviceLocation?.regionId || "");
  const [selectedCity, setSelectedCity] = useState(data?.serviceLocation?.cityId || "");
  const [selectedDistricts, setSelectedDistricts] = useState(data?.serviceLocation?.districtIds || []);

  const existingNationalIdImages = data?.nationalIdImage ? [data.nationalIdImage] : [];
  const existingCommercialImages = data?.commercialRecordImage ? [data.commercialRecordImage] : [];

  const { data: regionsData, error: regionsError } = useRegions();
  const { data: citiesData, error: citiesError } = useCitiesByRegion(selectedRegion);
  const { data: districtsData, error: districtsError } = useDistrictsByCity(selectedCity);

  const regions = regionsData?.data?.regions || [];
  const cities = citiesData?.data?.cities || [];
  const districts = districtsData?.data?.districts || [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors: zodErrors } = validateForm(
      {
        nationalId: formData.nationalId,
        serviceDescription: formData.description,
      },
      serviceDetailsSchema
    );
    if (!isValid) {
      setErrors(zodErrors);
      return;
    }
    setErrors({});

    setIsLoading(true);
    try {
      if (onSave) {
        const payload = {
          serviceDescription: formData.description,
          nationalId: formData.nationalId,
        };
        if (nationalIdImages.length > 0) {
          payload.nationalIdImage = nationalIdImages;
        }
        if (commercialRecordImages.length > 0) {
          payload.commercialRecordImage = commercialRecordImages;
        }
        const hasLocation = selectedRegion || selectedCity || selectedDistricts.length;
        if (hasLocation) {
          payload.serviceLocation = {
            regionId: selectedRegion || undefined,
            cityId: selectedCity || undefined,
            districtIds: selectedDistricts,
          };
        }
        await onSave(payload);
      }
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderError = (error) => {
    if (!error) return null;
    return <span className={styles.error}>{t("common.errors.locationLoadFailed", "Couldn't load locations")}</span>;
  };

  return (
    <div className={styles.editFormContainer}>
      <EditFormHeader onClose={onClose} />

      <form onSubmit={handleSubmit} className={styles.editForm}>
        <DocumentUploadsRow
          nationalIdImages={nationalIdImages}
          setNationalIdImages={setNationalIdImages}
          commercialRecordImages={commercialRecordImages}
          setCommercialRecordImages={setCommercialRecordImages}
          existingNationalIdImages={existingNationalIdImages}
          existingCommercialImages={existingCommercialImages}
        />

        <div className={styles.editFormField}>
          <label className={styles.editFormLabel}>{t("serviceDetails.nationalIdLabel")}</label>
          <input
            type="text"
            className={styles.editFormInput}
            value={formData.nationalId}
            onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
            placeholder={t("serviceDetails.nationalIdPlaceholder", "Enter national ID")}
            inputMode="numeric"
            maxLength={10}
          />
          {errors.nationalId && (
            <span className={styles.error}>{errors.nationalId}</span>
          )}
        </div>

        <div className={styles.editFormField}>
          <label className={styles.editFormLabel}>{t("serviceDetails.serviceDescription")}</label>
          <textarea
            className={styles.editFormTextarea}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t("serviceDetails.serviceDescriptionPlaceholder")}
            rows={4}
          />
          {errors.serviceDescription && (
            <span className={styles.error}>{errors.serviceDescription}</span>
          )}
        </div>

        <div className={styles.editFormSection}>
          <label className={styles.editFormSectionLabel}>{t("serviceDetails.serviceLocation", "Service Location")}</label>
          {renderError(regionsError || citiesError || districtsError)}
          <LocationFieldsRow
            regions={regions}
            cities={cities}
            districts={districts}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            selectedDistricts={selectedDistricts}
            setSelectedDistricts={setSelectedDistricts}
          />
        </div>

        <div className={styles.editFormFooter}>
          <button type="submit" className={styles.editFormSubmitBtn} disabled={isLoading}>
            {isLoading ? t("buttons.saving", "Saving...") : t("buttons.save", "Save")}
          </button>
          <button type="button" className={styles.editFormCancelBtn} onClick={onClose} disabled={isLoading}>
            {t("buttons.cancel", "Cancel")}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceDetailsEditForm;
