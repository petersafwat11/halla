import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTranslation } from "../../../localization";

const VendorProfileCard = ({ vendor }) => {
  const { t } = useTranslation("marketplace");

  return (
    <View style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <View style={styles.vendorInfo}>
          <View style={styles.vendorDetails}>
            <Text style={styles.vendorName}>
              {vendor.companyName || t("vendor.defaultName")}
            </Text>
            <View style={styles.vendorStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  ({vendor.reviewCount || "127"} {t("vendor.users")})
                </Text>
                <Text style={styles.statLabel}>{vendor.rating || "4.9"}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {vendor.experience || "10"} {t("vendor.years")}
                </Text>
              </View>
            </View>
          </View>
          {vendor.logo && (
            <Image source={{ uri: vendor.logo }} style={styles.vendorLogo} resizeMode="contain" />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  vendorCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    padding: 20,
    gap: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vendorHeader: { gap: 12 },
  vendorInfo: { flexDirection: "row", gap: 8 },
  vendorDetails: { flex: 1, gap: 8 },
  vendorName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#262626",
    lineHeight: 20,
  },
  vendorStats: { flexDirection: "row", gap: 8 },
  stat: { flexDirection: "row", alignItems: "center", gap: 8 },
  statLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#262626",
    lineHeight: 16,
  },
  statValue: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#737373",
    lineHeight: 16,
  },
  vendorLogo: { width: 24, height: 24, borderRadius: 4 },
});

export default VendorProfileCard;
