import { useState, useEffect } from "react";
import marketplaceService from "../services/marketplaceService";

const DEFAULT_FILTERS = {
  serviceType: "all",
  regionId: "",
  cityId: "",
  districtIds: [],
  minPrice: "",
  maxPrice: "",
  minRating: "",
};

export const useFilterData = (i18nLanguage) => {
  const [localFilters, setLocalFilters] = useState(DEFAULT_FILTERS);
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

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

  const fetchRegions = async () => {
    try {
      const response = await marketplaceService.getRegions();
      if (response.status === "success") {
        const data = response.data?.regions || response.data || [];
        setRegions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching regions:", error);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const response = await marketplaceService.getServiceTypes(i18nLanguage);
      if (response.status === "success") {
        const isAr = i18nLanguage === "ar";
        const cats = response.data?.categories || response.data || [];
        setServiceTypes(
          (Array.isArray(cats) ? cats : []).map((c) => ({
            key: c.key, name: isAr ? c.nameAr : c.nameEn,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching service types:", error);
    }
  };

  const fetchCities = async (regionId) => {
    try {
      setLoadingCities(true);
      const response = await marketplaceService.getCities(regionId);
      if (response.status === "success") {
        const data = response.data?.cities || response.data || [];
        setCities(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchDistricts = async (cityId) => {
    try {
      setLoadingDistricts(true);
      const response = await marketplaceService.getDistricts(cityId);
      if (response.status === "success") {
        const data = response.data?.districts || response.data || [];
        setDistricts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    } finally {
      setLoadingDistricts(false);
    }
  };

  useEffect(() => {
    fetchRegions();
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (localFilters.regionId) {
      fetchCities(localFilters.regionId);
    } else {
      setCities([]);
      setDistricts([]);
    }
  }, [localFilters.regionId]);

  useEffect(() => {
    if (localFilters.cityId) {
      fetchDistricts(localFilters.cityId);
    } else {
      setDistricts([]);
    }
  }, [localFilters.cityId]);

  return {
    localFilters, setLocalFilters, regions, cities, districts,
    serviceTypes, loadingCities, loadingDistricts,
    updateFilter, toggleDistrict, resetFilters,
  };
};
