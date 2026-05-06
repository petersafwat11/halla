import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, typography } from "../../../styles/tokens";

const VendorStatsRow = ({ vendor }) => {
  const { t } = useTranslation("admin");
  const rating = vendor?.averageRating;
  const roleData = vendor?.roleData || vendor?.vendorData || {};
  const categories = vendor?.serviceCategories || roleData?.serviceCategories || [];
  const region =
    roleData?.serviceLocation?.regionNameAr ||
    roleData?.serviceLocation?.regionNameEn ||
    vendor?.location?.region ||
    vendor?.location?.city ||
    null;

  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: "#fff4e0" }]}>
        <Ionicons name="star" size={14} color={colors.warning[500]} />
        <Text style={[styles.pillValue, { color: colors.warning[500] }]}>
          {rating != null ? Number(rating).toFixed(1) : "—"}
        </Text>
        <Text style={styles.pillLabel}>{t("vendorDetails.rating")}</Text>
      </View>

      <View style={[styles.pill, { backgroundColor: "#fdf3e7" }]}>
        <Ionicons name="grid-outline" size={14} color={colors.primary[500]} />
        <Text style={[styles.pillValue, { color: colors.primary[500] }]}>
          {categories.length}
        </Text>
        <Text style={styles.pillLabel}>{t("vendorDetails.categories_count", { count: categories.length })}</Text>
      </View>

      {region && (
        <View style={[styles.pill, { backgroundColor: "#e8f5ee" }]}>
          <Ionicons name="location-outline" size={14} color={colors.success[500]} />
          <Text
            style={[styles.pillValue, { color: colors.success[500] }]}
            numberOfLines={1}
          >
            {region}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginHorizontal: spacing[16],
    marginBottom: spacing[12],
    gap: spacing[8],
  },
  pill: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[12],
    borderRadius: borderRadius[12],
    gap: spacing[4],
  },
  pillValue: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
  },
  pillLabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
  },
});

export default VendorStatsRow;
