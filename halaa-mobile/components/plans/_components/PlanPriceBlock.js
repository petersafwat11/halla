import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { formatNumber } from "@halaa/shared/utils/locale";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import AdaptiveText from "../../commen/AdaptiveText";
import { colors, spacing, typography } from "../../../styles/tokens";
import SarIcon from "../../commen/SarIcon";

/**
 * Plan price header.
 *
 * Price contract (blueprint §6): a price is ONE atomic token. The number is
 * locale-formatted and LTR-isolated, the row keeps [number, SAR glyph] in
 * stable logical order with no shrink/wrap so digits and glyph can never
 * split across lines or BiDi-reorder against the plan name.
 */
const PlanPriceBlock = ({ planFamily, price, planName }) => {
  const { t, currentLanguage } = useTranslation("plans");
  const name =
    planName ||
    (planFamily ? t(`planFamilies.${planFamily}`, { defaultValue: planFamily }) : "");
  const tagline = planFamily
    ? t(`taglines.${planFamily}`, { defaultValue: "" })
    : "";

  return (
    <View style={styles.cardTop}>
      <View style={styles.cardTopRow}>
        <AdaptiveText style={styles.cardName} numberOfLines={2}>
          {name}
        </AdaptiveText>
        <View style={styles.priceRow}>
          <Text style={styles.priceNum}>
            {isolateLtr(formatNumber(price || 0, currentLanguage))}
          </Text>
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
    // Baseline (not center) alignment: the plan name and the price use
    // different font sizes / line heights, and centering their boxes lets
    // the smaller one ride high on iOS. Sharing the real Cairo baseline
    // keeps them on one visual line (same pattern as PaymentSummaryCard).
    alignItems: "baseline",
    gap: spacing[12],
  },
  cardName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.large,
    lineHeight: 28,
    color: colors.secondary[700],
    flex: 1,
    minWidth: 0,
  },
  // Atomic price token: number + SAR glyph stay glued in logical order.
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  priceNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: 26,
    color: colors.secondary[700],
    lineHeight: 36,
  },
  cardTagline: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.primary[500],
    lineHeight: 22,
  },
});

export default PlanPriceBlock;
