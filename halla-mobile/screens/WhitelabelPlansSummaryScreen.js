import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../localization";
import { useToast } from "../contexts/ToastContext";
import { useAuthStore } from "../stores/authStore";
import { useSubscribe } from "../hooks";
import adminDashboardService from "../services/adminDashboardService";
import TopBar from "../components/plans/TopBar";

const WhitelabelPlansSummaryScreen = () => {
  const { t, currentLanguage } = useTranslation("plans");
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const token = useAuthStore((state) => state.token);
  const subscribeMutation = useSubscribe();
  const isArabic = currentLanguage === "ar";

  const { selectedPlan } = route.params || {};

  const [discountCode, setDiscountCode]       = useState("");
  const [discountData, setDiscountData]       = useState(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [validating, setValidating]           = useState(false);

  const planPrice   = parseFloat(selectedPlan?.price) || 0;
  const discountAmt = discountData?.discountAmount || 0;
  const finalTotal  = Math.max(0, planPrice - discountAmt);

  const getPlanDisplayName = () =>
    isArabic
      ? selectedPlan?.nameAr || selectedPlan?.nameEn || ""
      : selectedPlan?.nameEn || selectedPlan?.nameAr || "";

  const getBillingPeriod = () => {
    const days = selectedPlan?.limits?.durationDays;
    if (days === 365) return isArabic ? "سنة كاملة" : "1 year (365 days)";
    if (days === 90)  return isArabic ? "٩٠ يوماً" : "90 days";
    if (days === 30)  return isArabic ? "٣٠ يوماً" : "30 days";
    return `${days || 90} ${isArabic ? "يوم" : "days"}`;
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || validating) return;
    setValidating(true);
    try {
      const res = await adminDashboardService.discounts.validate(token, {
        code: discountCode.trim().toUpperCase(),
        amount: planPrice,
        planType: "enterprise",
      });

      if (!res?.success) {
        setDiscountApplied(false);
        setDiscountData(null);
        toast.error(t("summary.invalidCode"));
        return;
      }

      const result = res?.data?.data;
      if (result?.valid) {
        setDiscountData(result);
        setDiscountApplied(true);
        toast.success(
          t("summary.discountCode.success", {
            amount: result.discountAmount?.toFixed(0) ?? 0,
          })
        );
      } else {
        setDiscountApplied(false);
        setDiscountData(null);
        toast.error(t("summary.invalidCode"));
      }
    } catch {
      setDiscountApplied(false);
      setDiscountData(null);
      toast.error(t("summary.invalidCode"));
    } finally {
      setValidating(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;
    try {
      const payload = {
        planCode: selectedPlan.code,
        ...(discountCode ? { discountCode: discountCode.trim() } : {}),
      };
      await subscribeMutation.mutateAsync(payload);
      toast.success(t("summary.subscriptionSuccess"));
      navigation.goBack();
      navigation.goBack();
    } catch (error) {
      if (error.status === 400 && error.message?.includes("already have an active subscription")) {
        toast.info(t("summary.activeSubscription"));
        navigation.goBack();
        navigation.goBack();
      } else {
        toast.error(t("summary.subscriptionFailed"));
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("summary.title")} showBack={true} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Plan Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t("summary.planDetails")}</Text>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.planInfo}>
                <View style={styles.planIcon}>
                  <Ionicons name="business-outline" size={24} color="#C28E5C" />
                </View>
                <View style={styles.planDetails}>
                  <Text style={styles.planName}>{getPlanDisplayName()}</Text>
                  <Text style={styles.planType}>
                    {isArabic ? "باقة مؤسسية" : "Enterprise Plan"}
                  </Text>
                </View>
                <View style={styles.planPrice}>
                  <Text style={styles.priceAmount}>{planPrice}</Text>
                  <Text style={styles.priceCurrency}>
                    {t("summary.currency")}
                  </Text>
                </View>
              </View>

              <View style={styles.featuresSummary}>
                {selectedPlan?.limits?.invitePool != null ? (
                  <View style={styles.featureItem}>
                    <Ionicons name="people-outline" size={18} color="#C28E5C" />
                    <Text style={styles.featureText}>
                      {(selectedPlan.limits.invitePool).toLocaleString()}{" "}
                      {isArabic ? "دعوة (رصيد مشترك)" : "invites (shared pool)"}
                    </Text>
                  </View>
                ) : selectedPlan?.limits?.maxInvitesPerEvent != null ? (
                  <View style={styles.featureItem}>
                    <Ionicons name="people-outline" size={18} color="#C28E5C" />
                    <Text style={styles.featureText}>
                      {selectedPlan.limits.maxInvitesPerEvent}{" "}
                      {isArabic ? "دعوة / مناسبة" : "invites / event"}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.featureItem}>
                  <Ionicons name="time-outline" size={18} color="#C28E5C" />
                  <Text style={styles.featureText}>
                    {isArabic ? "صالحة لمدة " : "Valid for "}
                    {selectedPlan?.limits?.durationDays || 90}{" "}
                    {isArabic ? "يوماً" : "days"}
                  </Text>
                </View>
              </View>

              <View style={styles.billingPeriod}>
                <Text style={styles.billingLabel}>
                  {t("summary.billingPeriod")}
                </Text>
                <Text style={styles.billingValue}>{getBillingPeriod()}</Text>
              </View>
            </View>
          </View>

          {/* Discount Code Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {t("summary.discountCode.title")}
              </Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.discountInputWrapper}>
                <TextInput
                  style={[
                    styles.discountInput,
                    discountApplied && styles.discountInputApplied,
                  ]}
                  placeholder={t("summary.discountCode.placeholder")}
                  placeholderTextColor="#999"
                  value={discountCode}
                  onChangeText={setDiscountCode}
                  editable={!discountApplied}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    (discountApplied || !discountCode.trim() || validating) &&
                      styles.applyButtonDisabled,
                  ]}
                  onPress={handleApplyDiscount}
                  disabled={discountApplied || !discountCode.trim() || validating}
                  activeOpacity={0.7}
                >
                  {validating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : discountApplied ? (
                    <>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                      <Text style={styles.applyButtonText}>
                        {t("summary.discountCode.applied")}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.applyButtonText}>
                      {t("summary.discountCode.apply")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Payment Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {t("summary.paymentSummary.title")}
              </Text>
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

                {discountAmt > 0 && (
                  <View style={[styles.summaryRow, styles.discountRow]}>
                    <Text style={styles.summaryLabel}>
                      {t("summary.paymentSummary.discount")}
                    </Text>
                    <Text style={styles.summaryValueDiscount}>
                      -{discountAmt.toFixed(0)} {t("summary.currency")}
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

          <Text style={styles.termsNotice}>{t("summary.termsNotice")}</Text>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.proceedButton,
              subscribeMutation.isPending && styles.proceedButtonDisabled,
            ]}
            onPress={handlePayment}
            disabled={subscribeMutation.isPending}
            activeOpacity={0.8}
          >
            {subscribeMutation.isPending ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.proceedButtonText}>
                  {t("summary.processing")}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.proceedButtonText}>
                  {t("summary.proceedButton")}
                </Text>
                <Ionicons
                  name={isArabic ? "chevron-back" : "chevron-forward"}
                  size={20}
                  color="#FFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  content: { flex: 1, backgroundColor: "#F9F4EF" },
  scrollContent: { padding: 20, paddingBottom: 100 },
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
  planName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#2C2C2C",
    marginBottom: 2,
  },
  planType: { fontFamily: "Cairo_400Regular", fontSize: 12, color: "#656565" },
  planPrice: { alignItems: "flex-end" },
  priceAmount: { fontFamily: "Cairo_700Bold", fontSize: 20, color: "#C28E5C" },
  priceCurrency: { fontFamily: "Cairo_600SemiBold", fontSize: 12, color: "#8A6541" },
  featuresSummary: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5ECE4",
    borderRadius: 8,
  },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontFamily: "Cairo_600SemiBold", fontSize: 12, color: "#6B4E33" },
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
  termsNotice: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: "#656565",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  proceedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C28E5C",
    paddingVertical: 14,
    borderRadius: 10,
  },
  proceedButtonDisabled: { backgroundColor: "#E5E7EA" },
  proceedButtonText: { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#FFF" },
});

export default WhitelabelPlansSummaryScreen;
