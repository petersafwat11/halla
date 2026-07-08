"use client";
import { useState, useEffect } from "react";

export const useLocationFormSelection = ({ watch, setValue, regions, cities }) => {
  const [isDistrictsDropdownOpen, setIsDistrictsDropdownOpen] = useState(false);

  const selectedRegionId = watch("serviceData.serviceLocation.regionId");
  const selectedCityId = watch("serviceData.serviceLocation.cityId");

  useEffect(() => {
    const region = regions.find((r) => r.region_id === selectedRegionId);
    if (region) {
      setValue("serviceData.serviceLocation.regionNameAr", region.name_ar);
      setValue("serviceData.serviceLocation.regionNameEn", region.name_en);
    }
  }, [selectedRegionId, regions, setValue]);

  useEffect(() => {
    const city = cities.find((c) => c.city_id === selectedCityId);
    if (city) {
      setValue("serviceData.serviceLocation.cityNameAr", city.name_ar);
      setValue("serviceData.serviceLocation.cityNameEn", city.name_en);
    }
  }, [selectedCityId, cities, setValue]);

  const handleRegionChange = (value) => {
    const regionId = parseInt(value);
    setValue("serviceData.serviceLocation.regionId", regionId);
    setValue("serviceData.serviceLocation.cityId", null);
    setValue("serviceData.serviceLocation.districtIds", []);
    setValue("serviceData.serviceLocation.districtNames", []);
    setValue("serviceData.serviceLocation.coverageType", "region");
  };

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

  const handleDistrictToggle = (districtId, districts) => {
    const currentDistrictIds = watch("serviceData.serviceLocation.districtIds") || [];
    const currentDistrictNames = watch("serviceData.serviceLocation.districtNames") || [];

    if (districtId === "all") {
      setValue("serviceData.serviceLocation.districtIds", []);
      setValue("serviceData.serviceLocation.districtNames", []);
      setValue("serviceData.serviceLocation.coverageType", "city");
      return;
    }

    const district = districts.find((d) => d.district_id === districtId);
    const isSelected = currentDistrictIds.includes(districtId);

    if (isSelected) {
      const newIds = currentDistrictIds.filter((id) => id !== districtId);
      const newNames = currentDistrictNames.filter((d) => d.nameAr !== district?.name_ar);
      setValue("serviceData.serviceLocation.districtIds", newIds);
      setValue("serviceData.serviceLocation.districtNames", newNames);
      setValue("serviceData.serviceLocation.coverageType", newIds.length > 0 ? "districts" : "city");
    } else {
      setValue("serviceData.serviceLocation.districtIds", [...currentDistrictIds, districtId]);
      setValue("serviceData.serviceLocation.districtNames", [...currentDistrictNames, { nameAr: district?.name_ar, nameEn: district?.name_en }]);
      setValue("serviceData.serviceLocation.coverageType", "districts");
    }
  };

  return {
    isDistrictsDropdownOpen,
    setIsDistrictsDropdownOpen,
    selectedRegionId,
    selectedCityId,
    handleRegionChange,
    handleCityChange,
    handleDistrictToggle,
  };
};
