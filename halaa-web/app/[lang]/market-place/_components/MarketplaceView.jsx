"use client";

import React, { useMemo, useState } from "react";
import { SlidersHorizontal, X, SearchX, AlertCircle, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import { usePublicVendors, useVendorCategories } from "@/hooks/vendors";
import { useRegions, useCitiesByRegion, useDistrictsByCity } from "@/hooks/locations";
import MarketplaceHero from "./hero/MarketplaceHero";
import CategoryStrip from "./categories/CategoryStrip";
import VendorCard from "./card/Card";
import Pagination from "./pagination/Pagination";
import FiltersPopup from "./filtersPopup/FiltersPopup";
import { useMarketplaceFilters } from "../hooks/useMarketplaceFilters";
import styles from "./marketplaceView.module.css";

const ITEMS_PER_PAGE = 12;

export default function MarketplaceView({ vendorRoutePrefix = "market-place" }) {
  const { t, i18n } = useTranslation("marketplace");
  const { lang } = useParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const state = useMarketplaceFilters();
  const { data: categoriesResponse } = useVendorCategories();
  const { data: regionsResponse } = useRegions();
  const { data: citiesResponse, isLoading: loadingCities } = useCitiesByRegion(state.regionId);
  const { data: districtsResponse, isLoading: loadingDistricts } = useDistrictsByCity(state.cityId);

  const query = usePublicVendors({
    search: state.searchQuery,
    category: state.category === "all" ? undefined : state.category,
    regionId: state.regionId,
    cityId: state.cityId,
    districtIds: state.districtIds?.length ? state.districtIds : undefined,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    rating: state.minRating,
    lang,
    page: state.currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const categories = categoriesResponse?.data?.categories || [];
  const vendors = query.data?.data || [];
  const pagination = query.data?.pagination || {};
  const regions = regionsResponse?.data?.regions || [];
  const cities = citiesResponse?.data?.cities || [];
  const districts = districtsResponse?.data?.districts || [];

  const categoryLabels = useMemo(
    () => new Map(categories.map((item) => [item.key, i18n.language === "ar" ? item.nameAr : item.nameEn])),
    [categories, i18n.language]
  );

  const mappedVendors = vendors.map((vendor) => {
    const locationData = vendor.location || vendor.serviceLocation;
    const city = i18n.language === "ar" ? locationData?.cityNameAr : locationData?.cityNameEn;
    const region = i18n.language === "ar" ? locationData?.regionNameAr : locationData?.regionNameEn;
    return {
      ...vendor,
      categories: (vendor.categories || vendor.serviceCategories || []).map((key) => categoryLabels.get(key) || key),
      location: [city, region].filter(Boolean).join(i18n.language === "ar" ? "، " : ", ") || t("services.defaultLocation"),
      startingPrice: vendor.startingPrice || (vendor.minPrice != null ? { amount: vendor.minPrice, currency: t("currency") } : null),
    };
  });

  const total = pagination.total ?? mappedVendors.length;
  const totalPages = pagination.pages ?? 1;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <MarketplaceHero
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          searchValue={state.searchInput}
          onSearchChange={state.setSearchInput}
          onSearchClear={() => state.setSearchInput("")}
          searchPlaceholder={t("search.vendorPlaceholder")}
          searchLabel={t("search.vendorPlaceholder")}
          clearLabel={t("search.clear")}
        />

        <CategoryStrip
          categories={categories}
          language={i18n.language}
          activeKey={state.category}
          onSelect={state.handleSectionChange}
          allLabel={t("sections.all")}
          ariaLabel={t("sections.title")}
        />

        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <strong>{t("results.title", { count: total })}</strong>
            <span>{t("results.subtitle")}</span>
          </div>
          <button type="button" className={styles.filterButton} onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={20} aria-hidden="true" />
            {t("filters.title")}
            {state.activeFilters.length > 0 && <span className={styles.filterCount}>{state.activeFilters.length}</span>}
          </button>
        </div>

        {state.activeFilters.length > 0 && (
          <div className={styles.activeFilters}>
            {state.activeFilters.map((filter) => (
              <button key={filter.name} type="button" onClick={() => state.handleRemoveFilter(filter.name)}>{filter.label}<X size={14} /></button>
            ))}
            <button type="button" className={styles.resetButton} onClick={state.handleResetFilters}>{t("buttons.resetFilters")}</button>
          </div>
        )}

        {query.isLoading ? (
          <div className={styles.grid} aria-label={t("loading")} aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className={styles.skeletonCard} key={index}><span /><i /><b /><em /></div>
            ))}
          </div>
        ) : query.isError ? (
          <div className={styles.state}>
            <span className={styles.stateIcon}><AlertCircle size={30} aria-hidden="true" /></span>
            <h2>{t("errors.loadFailedTitle")}</h2>
            <p>{t("errors.loadFailed")}</p>
            <button type="button" onClick={() => query.refetch()}><RotateCcw size={16} aria-hidden="true" />{t("errors.retry")}</button>
          </div>
        ) : mappedVendors.length ? (
          <>
            <div className={styles.grid}>
              {mappedVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  href={`/${lang}/${vendorRoutePrefix}/vendors/${vendor.id}`}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={state.currentPage} totalPages={totalPages} totalItems={total} itemsPerPage={ITEMS_PER_PAGE} onPageChange={state.handlePageChange} />
            )}
          </>
        ) : (
          <div className={styles.state}>
            <span className={styles.stateIcon}><SearchX size={30} aria-hidden="true" /></span>
            <h2>{t("noResults.title")}</h2>
            <p>{t("noResults.description")}</p>
            <button type="button" onClick={state.handleResetFilters}><RotateCcw size={16} aria-hidden="true" />{t("buttons.resetFilters")}</button>
          </div>
        )}
      </div>

      <FiltersPopup
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={state.filters}
        updateFilter={state.updateFilter}
        regions={regions}
        cities={cities}
        districts={districts}
        loadingCities={loadingCities}
        loadingDistricts={loadingDistricts}
        activeFilters={state.activeFilters}
        onRemoveFilter={state.handleRemoveFilter}
        onReset={state.handleResetFilters}
      />
    </main>
  );
}
