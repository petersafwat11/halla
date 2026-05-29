import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/plans/TopBar";
import { VendorCards, MoreInfoPopup } from "../../components/marketplace";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import marketplaceService from "../../services/marketplaceService";
import { useMarketplaceServices } from "../../hooks";

const Marketplace = ({ navigation }) => {
  const { t } = useTranslation("marketplace");
  const toast = useToast();

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorPopup, setShowVendorPopup] = useState(false);

  const {
    data: infiniteData,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarketplaceServices({});

  useEffect(() => {
    if (error) {
      toast.error(t("errors.loadFailed", "فشل تحميل المزودين"));
    }
  }, [error, toast, t]);

  const vendors = useMemo(() => {
    const allServices = infiniteData?.pages?.flatMap((page) => page?.data || []) || [];
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#C28E5C" />

      <TopBar
        title={`${t("title", "المتجر")}${totalVendors ? ` (${totalVendors})` : ""}`}
        onBack={handleBack}
        showBack={!!navigation}
      />

      <View style={styles.content}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#C28E5C" },
  content: { flex: 1, backgroundColor: "#F9F4EF" },
});

export default Marketplace;
