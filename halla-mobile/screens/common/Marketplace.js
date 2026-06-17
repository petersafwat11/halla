import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/plans/TopBar";
import { VendorCards, MoreInfoPopup } from "../../components/marketplace";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useMarketplaceVendors } from "../../hooks";

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
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarketplaceVendors({});

  useEffect(() => {
    if (error) {
      toast.error(t("errors.loadFailed", "فشل تحميل المزودين"));
    }
  }, [error, toast, t]);

  const vendors = useMemo(() => {
    const allVendors = infiniteData?.pages?.flatMap((page) => page?.data || []) || [];
    return allVendors.map((v) => {
      const locations = v.serviceLocation;
      const cityName = locations?.cityNameAr || locations?.cityNameEn || "";
      const regionName = locations?.regionNameAr || locations?.regionNameEn || "";
      const location = [cityName, regionName].filter(Boolean).join(", ") || t("vendor.defaultLocation", "المملكة العربية السعودية");

      const minPrice = v.minPrice != null ? String(v.minPrice) : null;

      return {
        id: v.id,
        brandName: v.brandName,
        description: v.description,
        logo: v.logo,
        coverImage: v.coverImage,
        portfolio: v.portfolio || [],
        rating: v.rating || 0,
        reviewCount: v.numberOfRatings || 0,
        location,
        email: v.email,
        mobile: v.mobile,
        socialLinks: v.socialLinks || {},
        services: v.services || [],
        serviceCategories: v.serviceCategories || [],
        minPrice,
      };
    });
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
        title={`${t("title", "سوق هلا")}${totalVendors ? ` (${totalVendors})` : ""}`}
        onBack={handleBack}
        showBack={!!navigation}
      />

      <View style={styles.content}>
        <VendorCards
          vendors={vendors}
          onVendorCallPress={handleVendorCallPress}
          loading={loading}
          refreshing={isRefetching}
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
