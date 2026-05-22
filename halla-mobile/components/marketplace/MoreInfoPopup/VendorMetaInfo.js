import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";

const VendorMetaInfo = ({ vendor }) => {
  const { t } = useTranslation("marketplace");
  const hasIncluded = Array.isArray(vendor.included) && vendor.included.length > 0;
  const hasPrice = vendor.price != null && vendor.price !== "";

  return (
    <>
      {vendor.duration ? (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name="time-outline" size={14} color="#2563EB" />
            </View>
            <Text style={styles.infoTitle}>{t("vendor.serviceDuration")}</Text>
          </View>
          <Text style={styles.infoValue}>{vendor.duration}</Text>
        </View>
      ) : null}

      {hasPrice ? (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={[styles.iconBadge, styles.iconBadgeYellow]}>
              <Ionicons name="cash-outline" size={14} color="#D97706" />
            </View>
            <Text style={styles.infoTitle}>{t("vendor.price")}</Text>
          </View>
          <Text style={styles.infoValue}>
            {vendor.price} {t("vendor.sar")}
          </Text>
        </View>
      ) : null}

      {hasIncluded ? (
        <View style={styles.includedCard}>
          <Text style={styles.includedTitle}>{t("vendor.whatsIncluded")}</Text>
          <View style={styles.includedList}>
            {vendor.included.map((item, index) => (
              <View key={index} style={styles.includedItem}>
                <View style={styles.bullet} />
                <Text style={styles.includedText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    padding: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBadge: { backgroundColor: "#EFF6FF", borderRadius: 5, padding: 5 },
  iconBadgeYellow: { backgroundColor: "#FFFBEB" },
  infoTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20,
  },
  infoValue: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#1C1917",
    lineHeight: 16,
  },
  includedCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7E5E4",
    padding: 20,
    gap: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  includedTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20,
  },
  includedList: { gap: 12 },
  includedItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
  },
  includedText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#44403C",
    lineHeight: 16,
  },
});

export default VendorMetaInfo;
