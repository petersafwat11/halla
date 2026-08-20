import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { formatNumber } from "@halaa/shared/utils/locale";
import { colors, spacing, typography } from "../../../styles/tokens";
import SarIcon from "../../commen/SarIcon";

const PlanPriceBlock = ({ planFamily, price }) => {
  const { t, currentLanguage } = useTranslation("plans");
  const name = planFamily ? t(`planFamilies.${planFamily}`) : "";
  const tagline = planFamily
    ? t(`taglines.${planFamily}`, { defaultValue: "" })
    : "";

  return (
    <View style={styles.cardTop}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardName}>{name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceNum}>{formatNumber(price || 0, currentLanguage)}</Text>
          <SarIcon size={20} color={colors.secondary[700]} />
        </View>
      </View>
      {tagline ? <Text style={styles.cardTagline}>{tagline}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  cardTop: {
    flexDirection: "column",
    gap: spacing[8],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    marginBottom: spacing[16],
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[12],
  },
  cardName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.large,
    color: colors.secondary[700],
    flex: 1,
    minWidth: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: 26,
    color: colors.secondary[700],
    lineHeight: 28,
  },
  cardTagline: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.primary[500],
    lineHeight: 22,
  },
});

export default PlanPriceBlock;
