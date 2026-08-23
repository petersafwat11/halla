"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import styles from "./serviceDetailsSection.module.css";
import EditFormHeader from "./EditFormHeader";
import DocumentUploadsRow from "./DocumentUploadsRow";
import LocationFieldsRow from "./LocationFieldsRow";
import { useRegions, useCitiesByRegion, useDistrictsByCity } from "@/hooks/locations";
import { validateForm, serviceDetailsSchema } from "@/utils/schemas/vendorSettings";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import { normalizeDigitsOnly } from "@halaa/shared/utils/locale";
import {
  VENDOR_CATEGORY_KEYS,
  buildServiceCategoriesPayload,
} from "@/utils/vendorHelpers";

const ServiceDetailsEditForm = ({
  data,
  onSave,
  onClose,
  isLoading,
  setIsLoading,
  onRefetch,
}) => {
  const { t } = useTranslation("vendorSettings");

  const [formData, setFormData] = useState({
    description: data?.serviceDescription || "",
    taglineAr: data?.taglineAr || "",
    taglineEn: data?.taglineEn || "",
    aboutAr: data?.aboutAr || "",
    aboutEn: data?.aboutEn || "",
    nationalId: normalizeDigitsOnly(data?.nationalId || ""),
  });
  const [selectedCategories, setSelectedCategories] = useState(
    data?.serviceCategories || []
  );
  const [errors, setErrors] = useState({});
  const [nationalIdImages, setNationalIdImages] = useState([]);
  const [commercialRecordImages, setCommercialRecordImages] = useState([]);
  const [deletingField, setDeletingField] = useState(null);

  const [selectedRegion, setSelectedRegion] = useState(data?.serviceLocation?.regionId || "");
  const [selectedCity, setSelectedCity] = useState(data?.serviceLocation?.cityId || "");
  const [selectedDistricts, setSelectedDistricts] = useState(data?.serviceLocation?.districtIds || []);

  React.useEffect(() => {
    setFormData({
      description: data?.serviceDescription || "",
      taglineAr: data?.taglineAr || "",
      taglineEn: data?.taglineEn || "",
      aboutAr: data?.aboutAr || "",
      aboutEn: data?.aboutEn || "",
      nationalId: normalizeDigitsOnly(data?.nationalId || ""),
    });
    setSelectedCategories(data?.serviceCategories || []);
    setSelectedRegion(data?.serviceLocation?.regionId || "");
    setSelectedCity(data?.serviceLocation?.cityId || "");
    setSelectedDistricts(data?.serviceLocation?.districtIds || []);
    setNationalIdImages([]);
    setCommercialRecordImages([]);
    setErrors({});
  }, [data]);

  const existingNationalIdImages = data?.nationalIdImage ? [data.nationalIdImage] : [];
  const existingCommercialImages = data?.commercialRecordImage ? [data.commercialRecordImage] : [];

  const { data: regionsData, error: regionsError } = useRegions();
  const { data: citiesData, error: citiesError } = useCitiesByRegion(selectedRegion);
  const { data: districtsData, error: districtsError } = useDistrictsByCity(selectedCity);

  const regions = regionsData?.data?.regions || [];
  const cities = citiesData?.data?.cities || [];
  const districts = districtsData?.data?.districts || [];

  // Single-value document images live on the server; deletion hits the
  // shared DELETE endpoint with `{ field }` (no key — backend wipes the
  // stored value + S3 object) and asks the parent to refetch so the
  // form re-renders without the old preview.
  const handleDeleteExisting = async (field) => {
    if (
      !window.confirm(
        t("serviceDetails.confirmDeleteImage", "Delete this document?")
      )
    ) {
      return;
    }
    setDeletingField(field);
    try {
      await apiRequest({
        method: "DELETE",
        path: API_PATHS.users.deleteVendorImage,
        data: { field },
      });
      toast.success(t("messages.imageDeleted", "Image deleted"));
      if (onRefetch) onRefetch();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("messages.deleteFailed", "Failed to delete image")
      );
    } finally {
      setDeletingField(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors: zodErrors } = validateForm(
      {
        nationalId: formData.nationalId,
        serviceDescription: formData.description,
        taglineAr: formData.taglineAr,
        taglineEn: formData.taglineEn,
        aboutAr: formData.aboutAr,
        aboutEn: formData.aboutEn,
      },
      serviceDetailsSchema(t)
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
          serviceDescription:
            formData.aboutAr || formData.taglineAr || formData.description || "",
          taglineAr: formData.taglineAr,
          taglineEn: formData.taglineEn,
          aboutAr: formData.aboutAr,
          aboutEn: formData.aboutEn,
          nationalId: formData.nationalId,
        };
        if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
          payload.serviceCategories = buildServiceCategoriesPayload(selectedCategories);
        }
        if (nationalIdImages.length > 0) {
          payload.nationalIdImage = nationalIdImages;
        }
        if (commercialRecordImages.length > 0) {
          payload.commercialRecordImage = commercialRecordImages;
        }

        // The <select> elements emit strings, but the backend's strict zod
        // schema for `serviceLocation` requires `regionId` / `cityId` to be
        // numbers (`serviceLocation.regionId: Expected number, received
        // string`). Coerce here, and pull the matching localized names so
        // the read path can render the location without another lookup.
        const regionIdNum = selectedRegion ? Number(selectedRegion) : null;
        const cityIdNum = selectedCity ? Number(selectedCity) : null;
        const districtIdsNum = (selectedDistricts || [])
          .map((id) => Number(id))
          .filter((n) => Number.isFinite(n));

        const hasLocation =
          Number.isFinite(regionIdNum) ||
          Number.isFinite(cityIdNum) ||
          districtIdsNum.length > 0;

        if (hasLocation) {
          const matchedRegion = regions.find(
            (r) => Number(r.region_id) === regionIdNum
          );
          const matchedCity = cities.find(
            (c) => Number(c.city_id) === cityIdNum
          );
          const matchedDistricts = districts.filter((d) =>
            districtIdsNum.includes(Number(d.district_id))
          );

          const location = {};
          if (Number.isFinite(regionIdNum)) {
            location.regionId = regionIdNum;
            if (matchedRegion?.name_ar) location.regionNameAr = matchedRegion.name_ar;
            if (matchedRegion?.name_en) location.regionNameEn = matchedRegion.name_en;
          }
          if (Number.isFinite(cityIdNum)) {
            location.cityId = cityIdNum;
            if (matchedCity?.name_ar) location.cityNameAr = matchedCity.name_ar;
            if (matchedCity?.name_en) location.cityNameEn = matchedCity.name_en;
          }
          if (districtIdsNum.length > 0) {
            location.districtIds = districtIdsNum;
            location.districtNames = matchedDistricts.map((d) => ({
              ...(d.name_ar ? { nameAr: d.name_ar } : {}),
              ...(d.name_en ? { nameEn: d.name_en } : {}),
            }));
          }
          location.coverageType = districtIdsNum.length
            ? "districts"
            : Number.isFinite(cityIdNum)
            ? "city"
            : "region";

          payload.serviceLocation = location;
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
          onDeleteNationalId={() => handleDeleteExisting("nationalIdImage")}
          onDeleteCommercial={() => handleDeleteExisting("commercialRecordImage")}
          isDeletingNationalId={deletingField === "nationalIdImage"}
          isDeletingCommercial={deletingField === "commercialRecordImage"}
        />

        <div className={styles.editFormField}>
          <label className={styles.editFormLabel}>{t("serviceDetails.nationalIdLabel")}</label>
          <input
            type="text"
            className={styles.editFormInput}
            value={formData.nationalId}
            onChange={(e) => setFormData({ ...formData, nationalId: normalizeDigitsOnly(e.target.value) })}
            placeholder={t("serviceDetails.nationalIdPlaceholder", "Enter national ID")}
            inputMode="numeric"
            maxLength={10}
          />
          {errors.nationalId && (
            <span className={styles.error}>{errors.nationalId}</span>
          )}
        </div>

        {[
          ["taglineAr", t("serviceDetails.taglineAr", "النبذة القصيرة بالعربية"), 160, false, "rtl"],
          ["taglineEn", t("serviceDetails.taglineEn", "Short tagline in English"), 160, false, "ltr"],
          ["aboutAr", t("serviceDetails.aboutAr", "نبذة تفصيلية بالعربية"), 2000, true, "rtl"],
          ["aboutEn", t("serviceDetails.aboutEn", "Detailed description in English"), 2000, true, "ltr"],
        ].map(([key, label, maxLength, multiline, dir]) => (
          <div className={styles.editFormField} key={key} dir={dir}>
            <label className={styles.editFormLabel}>{label}</label>
            {multiline ? (
              <textarea className={styles.editFormTextarea} value={formData[key]} maxLength={maxLength} rows={5} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
            ) : (
              <input className={styles.editFormInput} value={formData[key]} maxLength={maxLength} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
            )}
          </div>
        ))}

        <div className={styles.editFormSection}>
          <label className={styles.editFormSectionLabel}>
            {t("serviceDetails.categories", "الأنشطة / التصنيفات")}
          </label>
          <div className={styles.categoryChips}>
            {VENDOR_CATEGORY_KEYS.map((key) => {
              const selected = selectedCategories.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.categoryChip} ${
                    selected ? styles.categoryChipSelected : ""
                  }`}
                  onClick={() => {
                    setSelectedCategories((prev) =>
                      prev.includes(key)
                        ? prev.filter((k) => k !== key)
                        : [...prev, key]
                    );
                  }}
                >
                  {t(`services.serviceTypes.${key}`, key)}
                </button>
              );
            })}
          </div>
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
