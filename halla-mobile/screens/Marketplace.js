import React, { useState, useMemo } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../components/plans/TopBar";
import {
  SearchAndFilter,
  VendorCards,
  MoreInfoPopup,
} from "../components/marketplace";
import FilterPopup from "../components/marketplace/FilterPopup";
import { useTranslation } from "../localization";
import marketplaceService from "../services/marketplaceService";
import { useVendors } from "../hooks";

const Marketplace = ({ navigation }) => {
  const { t, i18n } = useTranslation("marketplace");

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorPopup, setShowVendorPopup] = useState(false);

  // Filters State (includes serviceType for sections)
  const [filters, setFilters] = useState({
    serviceType: "all",
    regionId: "",
    cityId: "",
    districtIds: [],
    minPrice: "",
    maxPrice: "",
    minRating: "",
  });

  // Build query params
  const queryParams = useMemo(() => ({
    search: searchQuery,
    ...filters,
    districtIds: filters.districtIds?.join(","),
  }), [searchQuery, filters]);

  // Fetch vendors using React Query (infinite scroll)
  const {
    data: infiniteData,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVendors(queryParams);

  // Flatten all pages into a single array
  const vendors = useMemo(() => {
    const allServices = infiniteData?.pages?.flatMap(page => page?.data || []) || [];
    return allServices.map((service) => ({
      id: service.id,
      name: service.name || t("vendor.defaultName"),
      location: service.serviceLocation?.regionNameAr
        ? `${service.serviceLocation.cityNameAr || ""}, ${
            service.serviceLocation.regionNameAr
          }`
        : t("vendor.defaultLocation"),
      rating: service.rating || "0",
      reviewCount: service.reviewsCount || "0",
      price: service.price ? `${service.price}` : "",
      image: marketplaceService.getImageUrl(
        service.image || service.vendor?.logo || service.vendor?.avatar,
      ),
      tags: service.tags || [],
      duration: service.duration || "",
      priceRange: service.priceRange || "",
      included: service.included || [],
      companyName: service.vendor?.brandName || "",
      experience: service.vendor?.yearsOfExperience || "",
      website: service.vendor?.website || "",
      email: service.vendor?.email || "",
      phone: service.vendor?.phone || "",
      description: service.description || "",
    }));
  }, [infiniteData, t]);

  const totalVendors = infiniteData?.pages?.[0]?.pagination?.total || vendors.length;

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilterPress = () => {
    setShowFilterPopup(true);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      serviceType: "all",
      regionId: "",
      cityId: "",
      districtIds: [],
      minPrice: "",
      maxPrice: "",
      minRating: "",
    });
  };

  const handleVendorCallPress = (vendor) => {
    setSelectedVendor(vendor);
    setShowVendorPopup(true);
  };

  const handleCloseVendorPopup = () => {
    setShowVendorPopup(false);
    setTimeout(() => setSelectedVendor(null), 300);
  };

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  // Count active filters
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
        title={`${t("title")} (${totalVendors})`}
        onBack={handleBack}
        showBack={!!navigation}
      />

      <View style={styles.content}>
        {/* Search and Filter Bar */}
        <SearchAndFilter
          onSearch={handleSearch}
          onFilterPress={handleFilterPress}
          searchQuery={searchQuery}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Vendor Cards */}
        <VendorCards
          vendors={vendors}
          onVendorCallPress={handleVendorCallPress}
          loading={loading}
          refreshing={false}
          onRefresh={refetch}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          isFetchingNextPage={isFetchingNextPage}
        />
      </View>

      {/* Vendor Details Popup */}
      <MoreInfoPopup
        visible={showVendorPopup}
        vendor={selectedVendor}
        onClose={handleCloseVendorPopup}
      />

      {/* Filters Popup */}
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
  container: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  content: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
});

export default Marketplace;
