import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminVendorsInfinite, useGiveVendorRating } from "../../hooks";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import TopBar from "../../components/plans/TopBar";
import { VendorList, RatingModal } from "../../components/admin-dashboard/vendors";
import { backgrounds } from "../../styles/tokens";

const AdminVendorsScreen = ({ navigation }) => {
  const toast  = useToast();
  const { t }  = useTranslation("admin");
  // Phase 4 W3-PAGE: infinite scroll across vendors.
  const {
    items: vendors,
    isLoading,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAdminVendorsInfinite();
  const ratingMutation = useGiveVendorRating();
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const handleVendorPress = (vendor) => {
    navigation.navigate("VendorDetails", { vendorId: vendor._id || vendor.id });
  };

  const handleRate = (vendor) => {
    setSelectedVendor(vendor);
    setRatingModalVisible(true);
  };

  const handleRatingSave = async (ratingData) => {
    if (!selectedVendor) return;
    try {
      await ratingMutation.mutateAsync({
        vendorId: selectedVendor._id || selectedVendor.id,
        ratingData,
      });
      toast.success(t("common.success"));
      setRatingModalVisible(false);
      setSelectedVendor(null);
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("vendors.title")} showBack={true} />
        <VendorList
          vendors={vendors}
          loading={isLoading}
          onRefresh={refetch}
          onVendorPress={handleVendorPress}
          onRate={handleRate}
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
          loadingMore={isFetchingNextPage}
        />
        <RatingModal
          visible={ratingModalVisible}
          vendor={selectedVendor}
          onClose={() => {
            setRatingModalVisible(false);
            setSelectedVendor(null);
          }}
          onSave={handleRatingSave}
          loading={ratingMutation.isPending}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgrounds.card[8],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
});

export default AdminVendorsScreen;
