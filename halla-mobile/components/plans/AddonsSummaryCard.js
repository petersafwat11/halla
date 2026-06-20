import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const labelFor = (item, t) => {
  const type = item.addonType || item.type;
  if (type === "extra_invites") {
    return t("summary.addonItems.extra_invites", { quantity: item.quantity });
  }
  if (type === "design_template") {
    return t("summary.addonItems.design_template");
  }
  return type;
};

const AddonsSummaryCard = ({ addonItems = [], t }) => {
  if (!addonItems.length) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{t("summary.addonsTitle")}</Text>
      </View>
      <View style={styles.cardContent}>
        {addonItems.map((item, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.label} numberOfLines={2}>
              {labelFor(item, t)}
            </Text>
            <Text style={styles.value}>
              {item.price} {t("common.currency.sar")}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    padding: spacing[16],
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  cardHeader: {
    paddingBottom: spacing[8],
    marginBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[700],
  },
  cardContent: {
    gap: spacing[8],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[12],
  },
  label: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
  },
  value: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.accent[500],
  },
});

export default AddonsSummaryCard;
