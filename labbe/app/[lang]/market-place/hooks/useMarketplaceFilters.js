"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebounce } from "@halla/shared/utils/useDebounce";

/**
 * Encapsulates all URL-based filter state and handlers for the Marketplace page.
 */
export const useMarketplaceFilters = () => {
  const { t } = useTranslation("marketplace");
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State - derive from URL
  const category = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("search") || "";
  const regionId = searchParams.get("regionId") || "";
  const cityId = searchParams.get("cityId") || "";
  // Phase 8 — memoised so the `|| []` fallback doesn't produce a fresh
  // array every render and bust the `activeFilters` useMemo below.
  const districtIds = useMemo(
    () => searchParams.get("districtIds")?.split(",").filter(Boolean) || [],
    [searchParams]
  );
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const minRating = searchParams.get("minRating") || "";
  const currentPage = parseInt(searchParams.get("page")) || 1;

  // Local state for search input before debounce
  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 400);

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      const params = new URLSearchParams(searchParams);
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearch, searchQuery, searchParams, router]);

  const handleSectionChange = useCallback(
    (section) => {
      const params = new URLSearchParams(searchParams);
      if (section === "all") {
        params.delete("category");
      } else {
        params.set("category", section);
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const updateFilter = useCallback(
    (key, value) => {
      const params = new URLSearchParams(searchParams);

      if (
        value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        value === null ||
        value === undefined
      ) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(","));
      } else {
        params.set(key, value);
      }

      if (key === "regionId") {
        params.delete("cityId");
        params.delete("districtIds");
      }
      if (key === "cityId") {
        params.delete("districtIds");
      }

      params.set("page", "1");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleRemoveFilter = useCallback(
    (filterName) => {
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
    },
    [searchParams, router]
  );

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

  const handlePageChange = useCallback(
    (page) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`, { scroll: true });
    },
    [searchParams, router]
  );

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

  return {
    // URL-derived filter values
    category,
    searchQuery,
    regionId,
    cityId,
    districtIds,
    minPrice,
    maxPrice,
    minRating,
    currentPage,
    // Local state
    searchInput,
    setSearchInput,
    // Computed
    activeFilters,
    filters: { regionId, cityId, districtIds, minPrice, maxPrice, minRating },
    // Handlers
    handleSectionChange,
    updateFilter,
    handleRemoveFilter,
    handleResetFilters,
    handlePageChange,
  };
};
