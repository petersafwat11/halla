import React from "react";
import { View, Text, StyleSheet } from "react-native";

const PaymentSummaryCard = ({ planPrice, discountAmount, finalTotal, t }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{t("summary.paymentSummary.title")}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.summaryBreakdown}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {t("summary.paymentSummary.planPrice")}
          </Text>
          <Text style={styles.summaryValue}>
            {planPrice} {t("summary.currency")}
          </Text>
        </View>

        {discountAmount > 0 && (
          <View style={[styles.summaryRow, styles.discountRow]}>
            <Text style={styles.summaryLabel}>
              {t("summary.paymentSummary.discount")}
            </Text>
            <Text style={styles.summaryValueDiscount}>
              -{discountAmount.toFixed(0)} {t("summary.currency")}
            </Text>
          </View>
        )}

        <View style={styles.summaryDivider} />

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>
            {t("summary.paymentSummary.total")}
          </Text>
          <Text style={styles.totalValue}>
            {finalTotal.toFixed(0)} {t("summary.currency")}
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
  },
  cardContent: { gap: 16 },
  summaryBreakdown: { gap: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#656565",
  },
  summaryValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#2C2C2C",
  },
  discountRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0FFF4",
    borderRadius: 6,
    marginVertical: 4,
  },
  summaryValueDiscount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#10B981",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EA",
    marginVertical: 8,
  },
  totalRow: { paddingTop: 8 },
  totalLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
  },
  totalValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    color: "#C28E5C",
  },
});

export default PaymentSummaryCard;
