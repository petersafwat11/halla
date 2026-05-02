import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminVendors, useGiveVendorRating } from "../../hooks";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import TopBar from "../../components/plans/TopBar";
import { VendorList, RatingModal } from "../../components/admin-dashboard/vendors";
import { backgrounds } from "../../styles/tokens";

const AdminVendorsScreen = ({ navigation }) => {
  const toast  = useToast();
  const { t }  = useTranslation("admin");
  const { data, isLoading, refetch } = useAdminVendors({ page: 1, limit: 50 });
  const ratingMutation = useGiveVendorRating();
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const vendors = data?.data?.vendors || data?.data?.data || [];

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
