import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const PaymentSummaryCard = ({
  planPrice,
  addonTotal = 0,
  discountAmount,
  finalTotal,
  t,
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{t("summary.paymentSummary.title")}</Text>
    </View>

    <View style={styles.cardContent}>
      <Row
        label={t("summary.paymentSummary.planPrice")}
        value={`${planPrice} ${t("summary.currency")}`}
      />

      {addonTotal > 0 && (
        <Row
          label={t("summary.paymentSummary.addons")}
          value={`${addonTotal} ${t("summary.currency")}`}
        />
      )}

      {discountAmount > 0 && (
        <View style={styles.discountRow}>
          <Text style={styles.summaryLabel}>
            {t("summary.paymentSummary.discount")}
          </Text>
          <Text style={styles.summaryValueDiscount}>
            -{discountAmount.toFixed(0)} {t("summary.currency")}
          </Text>
        </View>
      )}

      <View style={styles.summaryDivider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          {t("summary.paymentSummary.total")}
        </Text>
        <View style={styles.totalValueWrap}>
          <Text style={styles.totalValue}>{finalTotal.toFixed(0)}</Text>
          <Text style={styles.totalCurrency}>{t("summary.currency")}</Text>
        </View>
      </View>
    </View>
  </View>
);

const Row = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
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
