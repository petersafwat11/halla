import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdaptiveText from "../../../../components/commen/AdaptiveText";
import LocalizedText from "../../../../components/commen/LocalizedText";
import { formatCount } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../../../localization";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const AdminTopVendors = ({ vendors, t, onViewAll }) => {
  const { currentLanguage } = useTranslation("admin");
  if (!vendors.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="storefront-outline" size={18} color={colors.primary[500]} />
          <LocalizedText style={styles.sectionTitle}>{t("dashboard.topVendors.title")}</LocalizedText>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <LocalizedText style={styles.viewAllText}>{t("common.viewAll")}</LocalizedText>
          </TouchableOpacity>
        )}
      </View>
      {vendors.map((vendor, idx) => (
        <React.Fragment key={vendor.name ?? idx}>
          {idx > 0 && <View style={styles.divider} />}
          <View style={styles.listRow}>
            <Text style={styles.rankNumber}>{formatCount(idx + 1, currentLanguage)}</Text>
            {/* Vendor/store names are backend content — first-strong. */}
            <AdaptiveText style={styles.vendorName} numberOfLines={1}>
              {vendor.name}
            </AdaptiveText>
            <LocalizedText style={styles.clicksCount}>
              {t("dashboard.topVendors.clicksCount", {
                count: formatCount(vendor.numberOfClicks ?? 0, currentLanguage),
              })}
            </LocalizedText>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[12],
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  sectionTitle: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  viewAllText: {
    ...textStyles.labelLarge,
    color: colors.primary[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.natural[200],
    marginVertical: spacing[8],
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  rankNumber: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
    width: 20,
    textAlign: "center",
    flexShrink: 0,
  },
  vendorName: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    flex: 1,
  },
  clicksCount: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[500],
  },
});

export default AdminTopVendors;
