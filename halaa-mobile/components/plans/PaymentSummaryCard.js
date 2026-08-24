import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LocalizedText from "../commen/LocalizedText";
import { formatSar } from "@halaa/shared/utils";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { priceToken } from "@halaa/shared/utils/displayTokens";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

/**
 * Web/Moyasar payment breakdown.
 *
 * Every amount renders as ONE atomic LTR-isolated token (amount + currency)
 * so minus signs, digits and the currency label can never BiDi-reorder or
 * split (blueprint §6). Labels follow the UI locale.
 */
const PaymentSummaryCard = ({
  planPrice,
  addonTotal = 0,
  discountAmount,
  finalTotal,
  t,
}) => {
  const sar = t("summary.currency");

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <LocalizedText style={styles.cardTitle}>
          {t("summary.paymentSummary.title")}
        </LocalizedText>
      </View>

      <View style={styles.cardContent}>
        <Row
          label={t("summary.paymentSummary.planPrice")}
          value={priceToken(planPrice, sar)}
        />

        {addonTotal > 0 && (
          <Row
            label={t("summary.paymentSummary.addons")}
            value={priceToken(addonTotal, sar)}
          />
        )}

        {discountAmount > 0 && (
          <View style={styles.discountRow}>
            <LocalizedText style={styles.summaryLabel}>
              {t("summary.paymentSummary.discount")}
            </LocalizedText>
            {/* Minus sign stays glued inside the isolated token. */}
            <Text style={styles.summaryValueDiscount}>
              {isolateLtr(
                `-${formatSar(discountAmount, { trimTrailingZeros: true })} ${sar}`
              )}
            </Text>
          </View>
        )}

        <View style={styles.summaryDivider} />

        <View style={styles.totalRow}>
          <LocalizedText style={styles.totalLabel}>
            {t("summary.paymentSummary.total")}
          </LocalizedText>
          <View style={styles.totalValueWrap}>
            <Text style={styles.totalValue}>
              {isolateLtr(formatSar(finalTotal, { trimTrailingZeros: true }))}
            </Text>
            <Text style={styles.totalCurrency}>{sar}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <LocalizedText style={styles.summaryLabel}>{label}</LocalizedText>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    marginBottom: spacing[12],
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[900],
  },
  cardContent: {
    padding: spacing[16],
    gap: spacing[12],
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[12],
  },
  summaryLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
  summaryValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[900],
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: colors.success[50],
    borderRadius: borderRadius[8],
  },
  summaryValueDiscount: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.success[600],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.natural[200],
    marginVertical: spacing[4],
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing[12],
    paddingTop: spacing[4],
  },
  totalLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[900],
  },
  totalValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing[4],
  },
  totalValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
    color: colors.primary[700],
    letterSpacing: -0.3,
  },
  totalCurrency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.medium,
    color: colors.primary[600],
  },
});

export default PaymentSummaryCard;
