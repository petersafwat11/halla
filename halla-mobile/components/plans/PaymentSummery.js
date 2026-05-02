import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "../commen/Button";
import { useTranslation } from "../../localization";

const PaymentSummery = ({
  selectedPlan,
  additionalFeatures = [],
  onConfirm,
  onBack,
}) => {
  const { t } = useTranslation("plans");
  const [discountCode, setDiscountCode] = useState("");
  const [isApplyingCode, setIsApplyingCode] = useState(false);

  const calculateTotal = () => {
    let total = parseInt(selectedPlan?.price || 0);

    // Add additional features cost
    additionalFeatures.forEach((feature) => {
      // Extract price from feature price string
      const priceMatch = feature.price.match(/(\d+)/);
      if (priceMatch) {
        total += parseInt(priceMatch[0]);
      }
    });

    return total;
  };

  const calculateAdditionalTotal = () => {
    let total = 0;
    additionalFeatures.forEach((feature) => {
      const priceMatch = feature.price.match(/(\d+)/);
      if (priceMatch) {
        total += parseInt(priceMatch[0]);
      }
    });
    return total;
  };

  const handleApplyDiscount = () => {
    setIsApplyingCode(true);
    // Simulate API call
    setTimeout(() => {
      setIsApplyingCode(false);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("summary.orderSummary")}</Text>
          </View>

          <View style={styles.planSummaryCard}>
            <View style={[styles.planSummaryHeader]}>
              <View style={styles.planBadge}>
                <Ionicons name="flash" size={16} color="#C28E5C" />
                <Text style={styles.planBadgeText}>{selectedPlan?.name}</Text>
              </View>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPriceUnit}>{t("summary.perMonth")}</Text>
                <View style={styles.planPriceValue}>
                  <Text style={styles.planPriceCurrency}>﷼</Text>
                  <Text style={styles.planPrice}>{selectedPlan?.price}</Text>
                </View>
              </View>
            </View>
            <View style={styles.planDetail}>
              <Text style={styles.planDetailText}>{t("summary.guests", { count: 50 })}</Text>
            </View>
          </View>

          {additionalFeatures.length > 0 && (
            <View style={styles.additionalFeaturesCard}>
              <View style={[styles.additionalHeader]}>
                <Text style={styles.additionalPrice}>
                  ﷼ {calculateAdditionalTotal()}
                </Text>
                <Text style={styles.additionalTitle}>{t("summary.additionalServices")}</Text>
              </View>

              {additionalFeatures.map((feature, index) => (
                <View key={index} style={[styles.additionalFeatureRow]}>
                  <View style={styles.additionalFeaturePrice}>
                    <Text style={styles.additionalFeaturePriceText}>﷼</Text>
                    <Text style={styles.additionalFeaturePriceValue}>
                      {feature.price.match(/(\d+)/)?.[0]}
                    </Text>
                  </View>
                  <Text style={[styles.additionalFeatureName]}>
                    {feature.name} ({feature.quantity || "10"} {feature.unit})
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.subscriptionNote}>
            <Text style={styles.subscriptionNoteText}>
              {t("summary.subscriptionStartsNote")}
            </Text>
          </View>
        </View>

        {/* Discount Code Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("summary.discountCode.title")}</Text>
          </View>

          <View style={[styles.discountInputContainer]}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyDiscount}
              disabled={!discountCode || isApplyingCode}
            >
              <Text style={styles.applyButtonText}>{t("summary.discountCode.apply")}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.discountInput}
              placeholder={t("summary.discountPlaceholder")}
              placeholderTextColor="#767676"
              value={discountCode}
              onChangeText={setDiscountCode}
            />
          </View>
        </View>

        {/* Payment Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("summary.paymentTitle")}</Text>
          </View>

          <View style={styles.paymentSummaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("summary.basePlan")}</Text>
              <View style={styles.summaryPrice}>
                <Text style={styles.summaryPriceText}>﷼</Text>
                <Text style={styles.summaryPriceValue}>
                  {selectedPlan?.price}
                </Text>
              </View>
            </View>

            {additionalFeatures.length > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t("summary.additionalServicesLabel")}</Text>
                <View style={styles.summaryPrice}>
                  <Text style={styles.summaryPriceText}>﷼</Text>
                  <Text style={styles.summaryPriceValue}>
                    {calculateAdditionalTotal()}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("summary.totalLabel")}</Text>
              <View style={styles.totalPrice}>
                <Text style={styles.totalPriceText}>﷼</Text>
                <Text style={styles.totalPriceValue}>{calculateTotal()}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button text={t("summary.goToPayment")} onPress={onConfirm} size="large" />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
    padding: 8,
    marginBottom: 0,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#2C2C2C",
  },
  planSummaryCard: {
    backgroundColor: "#FFF",
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  planSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C28E5C",
    backgroundColor: "#F9F4EF",
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  planBadgeText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#2C2C2C",
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  planPriceValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  planPrice: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#8A6541",
  },
  planPriceCurrency: {
    fontSize: 14,
    color: "#8A6541",
  },
  planPriceUnit: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
    color: "#8A6541",
    paddingBottom: 2,
  },
  planDetail: {
    paddingHorizontal: 12,
  },
  planDetailText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
    // textAlign: "right"
  },
  additionalFeaturesCard: {
    backgroundColor: "#FFF",
    padding: 12,
    gap: 12,
    marginTop: -1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  additionalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F2F2F2",
    backgroundColor: "#FDFDFD",
  },
  additionalTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#2C2C2C",
  },
  additionalPrice: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#8A6541",
  },
  additionalFeatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  additionalFeatureName: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
  },
  additionalFeaturePrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  additionalFeaturePriceText: {
    fontSize: 10,
    color: "#8A6541",
  },
  additionalFeaturePriceValue: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#8A6541",
  },
  subscriptionNote: {
    backgroundColor: "#F5ECE4",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 8,
    marginTop: -1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  subscriptionNoteText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#8A6541",
    textAlign: "center",
  },
  discountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DFDFDF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  applyButton: {
    backgroundColor: "#C28E5C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  applyButtonText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#FFF",
  },
  discountInput: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 16,
    color: "#2C2C2C",
    paddingHorizontal: 12,
  },
  paymentSummaryCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
  },
  summaryPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  summaryPriceText: {
    fontSize: 10,
    color: "#8A6541",
  },
  summaryPriceValue: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#8A6541",
  },
  divider: {
    height: 1,
    backgroundColor: "#F2F2F2",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
    color: "#2C2C2C",
  },
  totalPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  totalPriceText: {
    fontSize: 14,
    color: "#8A6541",
  },
  totalPriceValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#8A6541",
  },
  footer: {
    backgroundColor: "#FFF",
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F2",
  },
});

export default PaymentSummery;
