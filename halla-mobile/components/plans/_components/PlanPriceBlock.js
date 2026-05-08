import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { colors, spacing, typography } from "../../../styles/tokens";

const PlanPriceBlock = ({ planFamily, billingType, price }) => {
  const { t } = useTranslation("plans");

  return (
    <View style={styles.cardTop}>
      <View style={styles.titleSection}>
        <Text style={styles.cardName}>{t(`planFamilies.${planFamily}`)}</Text>
        <Text style={styles.cardDesc}>
          {t(`planFamilyDescriptions.${planFamily}`)}
        </Text>
      </View>
      <View style={styles.priceWrap}>
        <View style={styles.priceRow}>
          <Text style={styles.priceNum}>{(price || 0).toLocaleString()}</Text>
          <Text style={styles.priceCur}>{t("currency")}</Text>
        </View>
        <Text style={styles.pricePer}>
          {billingType === "monthly"
            ? t("billingTypeLabels.monthly")
            : t("billingTypeLabels.event")}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[12],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    marginBottom: spacing[16],
  },
  titleSection: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.large,
    color: colors.secondary[700],
    marginBottom: spacing[4],
  },
  cardDesc: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
    lineHeight: 18,
  },
  priceWrap: {
    alignItems: "flex-end",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: 26,
    color: colors.secondary[700],
    lineHeight: 28,
  },
  priceCur: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[700],
  },
  pricePer: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.caption.large,
    color: colors.natural[400],
    marginTop: 2,
  },
});

export default PlanPriceBlock;
