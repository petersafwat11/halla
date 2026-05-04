"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useRouter } from "next/navigation";
import { usePublicVendorServices } from "@/hooks/reactQueryHooks/useServices";
import {
  useRegions,
  useCitiesByRegion,
  useDistrictsByCity,
} from "@/hooks/reactQueryHooks/useLocations";
import { useDebounce } from "@/hooks/useDebounce";
import styles from "./page.module.css";
import ServiceCard from "./_components/card/Card";
import Sections from "./_components/sections/Sections";
import Filters from "./_components/filters/Filters";
import FiltersPopup from "./_components/filtersPopup/FiltersPopup";
import Pagination from "./_components/pagination/Pagination";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const getImageUrl = (imagePath) => {
  if (!imagePath) return "/images/placeholder-vendor.jpg";
  if (imagePath.startsWith("http")) return imagePath;
  const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return `${BACKEND_URL}/api/${cleanPath}`;
};

const ITEMS_PER_PAGE = 12;

const MarketPlacePage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State - Get filters from URL
  const category = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("search") || "";
  const regionId = searchParams.get("regionId") || "";
  const cityId = searchParams.get("cityId") || "";
  const districtIds = searchParams.get("districtIds")?.split(",").filter(Boolean) || [];
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const minRating = searchParams.get("minRating") || "";
  const currentPage = parseInt(searchParams.get("page")) || 1;

  // Local state for inputs before debounce
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [isFiltersPopupOpen, setIsFiltersPopupOpen] = useState(false);

  // Debounced search value
  const debouncedSearch = useDebounce(searchInput, 400);

  // UI State
  const [selectedSection, setSelectedSection] = useState(category);

  // Update URL when section changes
  const handleSectionChange = useCallback((section) => {
    setSelectedSection(section);
    const params = new URLSearchParams(searchParams);
    if (section === "all") {
      params.delete("category");
    } else {
      params.set("category", section);
    }
    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Update URL when search changes (debounced)
  React.useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      const params = new URLSearchParams(searchParams);
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      params.set("page", "1"); // Reset to first page
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearch, searchQuery, searchParams, router]);

  // Fetch regions
  const { data: regionsData } = useRegions();
  const regions = regionsData?.data?.regions || [];

  // Fetch cities when region selected
  const { data: citiesData, isLoading: loadingCities } = useCitiesByRegion(
    regionId,
    { enabled: !!regionId }
  );
  const cities = citiesData?.data?.cities || [];

  // Fetch districts when city selected
  const { data: districtsData, isLoading: loadingDistricts } = useDistrictsByCity(
    cityId,
    { enabled: !!cityId }
  );
  const districts = districtsData?.data?.districts || [];

  // Server-side filtered services with pagination
  const { data: servicesData, isLoading } = usePublicVendorServices({
    search: searchQuery,
    category: selectedSection === "all" ? "" : selectedSection,
    regionId,
    cityId,
    districtIds,
    minPrice,
    maxPrice,
    minRating,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  // Extract vendors and pagination from response
  const vendors = useMemo(() => {
    const data = servicesData?.data || [];
    return Array.isArray(data) ? data : [];
  }, [servicesData]);

  const totalItems = servicesData?.pagination?.total || vendors.length;
  const totalPages = servicesData?.pagination?.pages || Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Build active filters for display
  const activeFilters = useMemo(() => {
    const result = [];
    if (regionId) result.push({ name: "region", label: t("filters.region") });
    if (cityId) result.push({ name: "city", label: t("filters.city") });
    if (districtIds?.length > 0) {
      result.push({
        name: "district",
        label: `${t("filters.district")} (${districtIds.length})`,
      });
    }
    if (minPrice || maxPrice) {
      result.push({ name: "price", label: t("filters.price") });
    }
    if (minRating) result.push({ name: "rating", label: t("filters.rating") });
    return result;
  }, [regionId, cityId, districtIds, minPrice, maxPrice, minRating, t]);

  // Filter update handler - updates URL
  const updateFilter = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams);

    if (value === "" || (Array.isArray(value) && value.length === 0) || value === null || value === undefined) {
      params.delete(key);
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(","));
      } else {
        params.delete(key);
      }
    } else {
      params.set(key, value);
    }

    // Clear dependent filters
    if (key === "regionId") {
      params.delete("cityId");
      params.delete("districtIds");
    }
    if (key === "cityId") {
      params.delete("districtIds");
    }

    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleRemoveFilter = useCallback((filterName) => {
    const params = new URLSearchParams(searchParams);

    if (filterName === "region") {
      params.delete("regionId");
      params.delete("cityId");
      params.delete("districtIds");
    } else if (filterName === "city") {
      params.delete("cityId");
      params.delete("districtIds");
    } else if (filterName === "district") {
      params.delete("districtIds");
    } else if (filterName === "price") {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else if (filterName === "rating") {
      params.delete("minRating");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleResetFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("regionId");
    params.delete("cityId");
    params.delete("districtIds");
    params.delete("minPrice");
    params.delete("maxPrice");
    params.delete("minRating");
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handlePageChange = useCallback((page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`, { scroll: true });
  }, [searchParams, router]);

  // Filters object for child components
  const filters = {
    regionId,
    cityId,
    districtIds,
    minPrice,
    maxPrice,
    minRating,
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t("marketplace.title")} ({totalItems})
          </h1>
        </div>

        <div className={styles.productList}>
          <div className={styles.sidebar}>
            <Sections
              selectedSection={selectedSection}
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
                  {vendors.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={{
                        id: service.id,
                        image: getImageUrl(service.image || service.vendor?.logo),
                        rating: service.rating || 0,
                        reviewsCount: service.reviewsCount || 0,
                        title: service.name || t("services.defaultName"),
                        location: service.serviceLocation?.regionNameAr
                          ? `${service.serviceLocation.cityNameAr || ""}, ${service.serviceLocation.regionNameAr}`
                          : t("services.defaultLocation"),
                        tags: service.tags || [],
                        price: service.price ? `${service.price} ${t("currency")}` : "",
                        description: service.description || "",
                        vendorName: service.vendor?.brandName || "",
                        onCallClick: service.vendor?.phone
                          ? () => { window.location.href = `tel:${service.vendor.phone}`; }
                          : undefined,
                      }}
                    />
                  ))}
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
                  <h3>{t("noResults.title", "No services found")}</h3>
                  <p>{t("noResults.description", "Try adjusting your filters or search query")}</p>
                  <button onClick={handleResetFilters} className={styles.resetButton}>
                    {t("buttons.resetFilters", "Reset Filters")}
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
    </div>
  );
};

export default MarketPlacePage;
