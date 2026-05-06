import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const PlanSummaryCard = ({ planName, planType, planPrice, currency, inviteInfo, validityInfo, billingPeriod, billingValue }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{planName}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.planInfo}>
        <View style={styles.planIcon}>
          <Ionicons name="business-outline" size={24} color="#C28E5C" />
        </View>
        <View style={styles.planDetails}>
          <Text style={styles.planDisplayName}>{planType}</Text>
        </View>
        <View style={styles.planPrice}>
          <Text style={styles.priceAmount}>{planPrice}</Text>
          <Text style={styles.priceCurrency}>{currency}</Text>
        </View>
      </View>
      {inviteInfo}
      {validityInfo}
      <View style={styles.billingPeriod}>
        <Text style={styles.billingLabel}>{billingPeriod}</Text>
        <Text style={styles.billingValue}>{billingValue}</Text>
      </View>
    </View>
  </View>
);

export const DiscountCodeCard = ({ title, discountCode, onCodeChange, onApply, discountApplied, validating, applyText, appliedText, placeholder }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.discountInputWrapper}>
        <TextInput
          style={[styles.discountInput, discountApplied && styles.discountInputApplied]}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={discountCode}
          onChangeText={onCodeChange}
          editable={!discountApplied}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={[styles.applyButton, (discountApplied || !discountCode.trim() || validating) && styles.applyButtonDisabled]}
          onPress={onApply}
          disabled={discountApplied || !discountCode.trim() || validating}
          activeOpacity={0.7}
        >
          {validating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : discountApplied ? (
            <>
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={styles.applyButtonText}>{appliedText}</Text>
            </>
          ) : (
            <Text style={styles.applyButtonText}>{applyText}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

export const PaymentSummaryCard = ({ title, planPrice, discountAmt, finalTotal, currency, planPriceLabel, discountLabel, totalLabel }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.summaryBreakdown}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{planPriceLabel}</Text>
          <Text style={styles.summaryValue}>{planPrice} {currency}</Text>
        </View>
        {discountAmt > 0 && (
          <View style={[styles.summaryRow, styles.discountRow]}>
            <Text style={styles.summaryLabel}>{discountLabel}</Text>
            <Text style={styles.summaryValueDiscount}>-{discountAmt.toFixed(0)} {currency}</Text>
          </View>
        )}
        <View style={styles.summaryDivider} />
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalValue}>{finalTotal.toFixed(0)} {currency}</Text>
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
  planInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5ECE4",
    justifyContent: "center",
    alignItems: "center",
  },
  planDetails: { flex: 1 },
  planDisplayName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#2C2C2C",
    marginBottom: 2,
  },
  planPrice: { alignItems: "flex-end" },
  priceAmount: { fontFamily: "Cairo_700Bold", fontSize: 20, color: "#C28E5C" },
  priceCurrency: { fontFamily: "Cairo_600SemiBold", fontSize: 12, color: "#8A6541" },
  billingPeriod: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billingLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: "#656565" },
  billingValue: { fontFamily: "Cairo_700Bold", fontSize: 13, color: "#2C2C2C" },
  discountInputWrapper: { flexDirection: "row", gap: 8 },
  discountInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#E5E7EA",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    color: "#2C2C2C",
    backgroundColor: "#FFF",
  },
  discountInputApplied: { backgroundColor: "#F5ECE4", borderColor: "#C28E5C" },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#C28E5C",
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
  },
  applyButtonDisabled: { backgroundColor: "#E5E7EA" },
  applyButtonText: { fontFamily: "Cairo_700Bold", fontSize: 13, color: "#FFF" },
  summaryBreakdown: { gap: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontFamily: "Cairo_400Regular", fontSize: 13, color: "#656565" },
  summaryValue: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: "#2C2C2C" },
  discountRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0FFF4",
    borderRadius: 6,
    marginVertical: 4,
  },
  summaryValueDiscount: { fontFamily: "Cairo_700Bold", fontSize: 13, color: "#10B981" },
  summaryDivider: { height: 1, backgroundColor: "#E5E7EA", marginVertical: 8 },
  totalRow: { paddingTop: 8 },
  totalLabel: { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#2C2C2C" },
  totalValue: { fontFamily: "Cairo_700Bold", fontSize: 20, color: "#C28E5C" },
});
