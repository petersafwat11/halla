import { useState } from "react";
import { useRegions, useCitiesByRegion, useDistrictsByCity } from "./locations";
import { useVendorCategories } from "./marketplace";

const DEFAULT_FILTERS = {
  serviceType: "all",
  regionId: "",
  cityId: "",
  districtIds: [],
  minPrice: "",
  maxPrice: "",
  minRating: "",
  sort: "recommended",
};

const pickLabel = (lang, ar, en) => (lang === "ar" ? ar || en : en || ar);

export const useFilterData = (i18nLanguage) => {
  const [localFilters, setLocalFilters] = useState(DEFAULT_FILTERS);

  const {
    data: regionsData, isLoading: loadingRegions, error: regionsError, refetch: refetchRegions,
  } = useRegions();
  const {
    data: citiesData, isLoading: loadingCities, error: citiesError, refetch: refetchCities,
  } = useCitiesByRegion(localFilters.regionId || undefined);
  const {
    data: districtsData, isLoading: loadingDistricts, error: districtsError, refetch: refetchDistricts,
  } = useDistrictsByCity(localFilters.cityId || undefined);
  const { data: categoriesData } = useVendorCategories();

  const regions = (regionsData?.data?.regions || []).map((r) => ({
    ...r,
    displayName: pickLabel(i18nLanguage, r.name_ar, r.name_en),
  }));
  const cities = (citiesData?.data?.cities || []).map((c) => ({
    ...c,
    displayName: pickLabel(i18nLanguage, c.name_ar, c.name_en),
  }));
  const districts = (districtsData?.data?.districts || []).map((d) => ({
    ...d,
    displayName: pickLabel(i18nLanguage, d.name_ar, d.name_en),
  }));

  const serviceTypes = categoriesData?.data?.categories
    ? (Array.isArray(categoriesData.data.categories) ? categoriesData.data.categories : []).map((c) => ({
        key: c.key,
        name: pickLabel(i18nLanguage, c.nameAr, c.nameEn),
      }))
    : [];

  const updateFilter = (key, value) => {
    setLocalFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "regionId") { next.cityId = ""; next.districtIds = []; }
      if (key === "cityId") { next.districtIds = []; }
      return next;
    });
  };

  const toggleDistrict = (id) => {
    setLocalFilters((prev) => {
      const ids = prev.districtIds || [];
      return {
        ...prev,
        districtIds: ids.includes(id) ? ids.filter((d) => d !== id) : [...ids, id],
      };
    });
  };

  const resetFilters = () => setLocalFilters(DEFAULT_FILTERS);

  const retryAll = () => {
    if (regionsError) refetchRegions();
    if (citiesError) refetchCities();
    if (districtsError) refetchDistricts();
  };

  return {
    localFilters, setLocalFilters, regions, cities, districts,
    serviceTypes, loadingRegions, loadingCities, loadingDistricts,
    regionsError, citiesError, districtsError,
    updateFilter, toggleDistrict, resetFilters, retryAll,
  };
};
