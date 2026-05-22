"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePublicVendorServices } from "@/hooks/reactQueryHooks/useServices";
import {
  useRegions,
  useCitiesByRegion,
  useDistrictsByCity,
} from "@/hooks/reactQueryHooks/useLocations";
import { getImageUrl } from "@/utils/vendorHelpers";
import { useMarketplaceFilters } from "./hooks/useMarketplaceFilters";
import styles from "./page.module.css";
import ServiceCard from "./_components/card/Card";
import Sections from "./_components/sections/Sections";
import Filters from "./_components/filters/Filters";
import FiltersPopup from "./_components/filtersPopup/FiltersPopup";
import Pagination from "./_components/pagination/Pagination";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import VendorInfoPopup from "./_components/vendorInfoPopup/VendorInfoPopup";

const ITEMS_PER_PAGE = 12;

const MarketPlacePage = () => {
  const { t } = useTranslation("marketplace");
  const [isFiltersPopupOpen, setIsFiltersPopupOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const {
    category,
    searchQuery,
    regionId,
    cityId,
    districtIds,
    minPrice,
    maxPrice,
    minRating,
    currentPage,
    searchInput,
    setSearchInput,
    activeFilters,
    filters,
    handleSectionChange,
    updateFilter,
    handleRemoveFilter,
    handleResetFilters,
    handlePageChange,
  } = useMarketplaceFilters();

  // Fetch location data
  const { data: regionsData } = useRegions();
  const regions = regionsData?.data?.regions || [];

  const { data: citiesData, isLoading: loadingCities } = useCitiesByRegion(
    regionId,
    { enabled: !!regionId }
  );
  const cities = citiesData?.data?.cities || [];

  const { data: districtsData, isLoading: loadingDistricts } =
    useDistrictsByCity(cityId, { enabled: !!cityId });
  const districts = districtsData?.data?.districts || [];

  // Fetch services with server-side filtering and pagination
  const { data: servicesData, isLoading } = usePublicVendorServices({
    search: searchQuery,
    category: category === "all" ? "" : category,
    regionId,
    cityId,
    districtIds,
    minPrice,
    maxPrice,
    minRating,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const vendors = useMemo(() => {
    const data = servicesData?.data || [];
    return Array.isArray(data) ? data : [];
  }, [servicesData]);

  const totalItems = servicesData?.pagination?.total ?? vendors.length;
  const totalPages =
    servicesData?.pagination?.pages ?? Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleOpenVendorInfo = useCallback((vendor) => {
    setSelectedVendor(vendor);
  }, []);

  const handleCloseVendorInfo = useCallback(() => {
    setSelectedVendor(null);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t("title")}
          </h1>
        </div>

        <div className={styles.productList}>
          <div className={styles.sidebar}>
            <Sections
              selectedSection={category}
              onSectionChange={handleSectionChange}
            />
          </div>

          <div className={styles.filtersAndGrid}>
            <Filters
              searchQuery={searchInput}
              onSearch={setSearchInput}
              filters={filters}
              updateFilter={updateFilter}
              regions={regions}
              cities={cities}
              districts={districts}
              loadingCities={loadingCities}
              loadingDistricts={loadingDistricts}
              activeFilters={activeFilters}
              resultsCount={vendors.length}
              totalCount={totalItems}
              onRemoveFilter={handleRemoveFilter}
              onOpenFiltersPopup={() => setIsFiltersPopupOpen(true)}
            />

            {isLoading ? (
              <SimpleLoading />
            ) : vendors.length > 0 ? (
              <>
                <div className={styles.servicesGrid}>
                  {vendors.map((service) => {
                    const location = service.serviceLocation?.regionNameAr
                      ? `${service.serviceLocation.cityNameAr || ""}, ${service.serviceLocation.regionNameAr}`
                      : "";
                    const image =
                      getImageUrl(service.image || service.vendor?.logo) ||
                      "/images/placeholder-vendor.jpg";
                    const vendorForPopup = {
                      id: service.id,
                      name: service.name || t("services.defaultName"),
                      image,
                      logo: getImageUrl(service.vendor?.logo) || null,
                      companyName: service.vendor?.brandName || "",
                      rating: service.rating || 0,
                      reviewCount: service.reviewsCount || 0,
                      duration: service.duration || "",
                      price: service.price ? String(service.price) : "",
                      currency: service.priceUnit || "",
                      included: service.included || [],
                      location: location || t("services.defaultLocation"),
                      website: service.vendor?.website || "",
                      email: service.vendor?.email || "",
                      phone: service.vendor?.phone || "",
                    };
                    return (
                      <ServiceCard
                        key={service.id}
                        service={{
                          id: service.id,
                          image,
                          rating: service.rating || 0,
                          reviewsCount: service.reviewsCount || 0,
                          title: service.name || t("services.defaultName"),
                          location: location || t("services.defaultLocation"),
                          tags: service.tags || [],
                          price: service.price
                            ? `${service.price} ${t("currency")}`
                            : "",
                          description: service.description || "",
                          vendorName: service.vendor?.brandName || "",
                          onCallClick: () => handleOpenVendorInfo(vendorForPopup),
                        }}
                      />
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            ) : (
              <div className={styles.noResults}>
                <div className={styles.emptyState}>
                  <h3>{t("noResults.title")}</h3>
                  <p>{t("noResults.description")}</p>
                  <button
                    onClick={handleResetFilters}
                    className={styles.resetButton}
                  >
                    {t("buttons.resetFilters")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FiltersPopup
        isOpen={isFiltersPopupOpen}
        onClose={() => setIsFiltersPopupOpen(false)}
        filters={filters}
        updateFilter={updateFilter}
        regions={regions}
        cities={cities}
        districts={districts}
        loadingCities={loadingCities}
        loadingDistricts={loadingDistricts}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onReset={handleResetFilters}
      />

      <VendorInfoPopup
        isOpen={!!selectedVendor}
        onClose={handleCloseVendorInfo}
        vendor={selectedVendor}
      />
    </div>
  );
};

export default MarketPlacePage;
