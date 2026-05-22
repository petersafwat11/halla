import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/plans/TopBar";
import {
  SearchAndFilter,
  VendorCards,
  MoreInfoPopup,
} from "../../components/marketplace";
import FilterPopup from "../../components/marketplace/FilterPopup";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import marketplaceService from "../../services/marketplaceService";
import { useMarketplaceServices } from "../../hooks";

const DEFAULT_FILTERS = {
  serviceType: "all",
  regionId: "",
  cityId: "",
  districtIds: [],
  minPrice: "",
  maxPrice: "",
  minRating: "",
};

const Marketplace = ({ navigation }) => {
  const { t, i18n } = useTranslation("marketplace");
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorPopup, setShowVendorPopup] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const queryParams = useMemo(() => ({
    search: searchQuery,
    ...filters,
    districtIds: filters.districtIds?.join(","),
  }), [searchQuery, filters]);

  const {
    data: infiniteData,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarketplaceServices(queryParams);

  useEffect(() => {
    if (error) {
      toast.error(t("errors.loadFailed", "فشل تحميل المزودين"));
    }
  }, [error, toast, t]);

  const vendors = useMemo(() => {
    const allServices = infiniteData?.pages?.flatMap(page => page?.data || []) || [];
    return allServices.map((service) => ({
      id: service.id,
      name: service.name || t("vendor.defaultName", "خدمة"),
      location: service.serviceLocation?.regionNameAr
        ? `${service.serviceLocation.cityNameAr || ""}, ${service.serviceLocation.regionNameAr}`
        : t("vendor.defaultLocation", "المملكة العربية السعودية"),
      rating: service.rating || 0,
      reviewCount: service.reviewsCount || 0,
      price: service.price ? `${service.price}` : "",
      image: marketplaceService.getImageUrl(
        service.image || service.vendor?.logo || service.vendor?.avatar,
      ),
      logo: marketplaceService.getImageUrl(service.vendor?.logo),
      tags: service.tags || [],
      duration: service.duration || "",
      included: service.included || [],
      companyName: service.vendor?.brandName || "",
      website: service.vendor?.website || "",
      email: service.vendor?.email || "",
      phone: service.vendor?.phone || "",
      description: service.description || "",
    }));
  }, [infiniteData, t]);

  const totalVendors = infiniteData?.pages?.[0]?.pagination?.total || vendors.length;

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleFilterPress = useCallback(() => {
    setShowFilterPopup(true);
  }, []);

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleVendorCallPress = useCallback((vendor) => {
    setSelectedVendor(vendor);
    setShowVendorPopup(true);
  }, []);

  const handleCloseVendorPopup = useCallback(() => {
    setShowVendorPopup(false);
    setTimeout(() => setSelectedVendor(null), 300);
  }, []);

  const handleBack = useCallback(() => {
    if (navigation) navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activeFiltersCount = [
    filters.serviceType && filters.serviceType !== "all",
    filters.regionId,
    filters.cityId,
    filters.districtIds?.length > 0,
    filters.minPrice || filters.maxPrice,
    filters.minRating,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#C28E5C" />

      <TopBar
        title={`${t("title", "المتجر")} (${totalVendors})`}
        onBack={handleBack}
        showBack={!!navigation}
      />

      <View style={styles.content}>
        <SearchAndFilter
          onSearch={handleSearch}
          onFilterPress={handleFilterPress}
          searchQuery={searchQuery}
          activeFiltersCount={activeFiltersCount}
        />

        <VendorCards
          vendors={vendors}
          onVendorCallPress={handleVendorCallPress}
          loading={loading}
          refreshing={false}
          onRefresh={handleRefresh}
          onEndReached={handleEndReached}
          isFetchingNextPage={isFetchingNextPage}
        />
      </View>

      <MoreInfoPopup
        visible={showVendorPopup}
        vendor={selectedVendor}
        onClose={handleCloseVendorPopup}
      />

      <FilterPopup
        visible={showFilterPopup}
        onClose={() => setShowFilterPopup(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#C28E5C" },
  content: { flex: 1, backgroundColor: "#F9F4EF" },
});

export default Marketplace;
