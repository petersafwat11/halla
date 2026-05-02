import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../localization";
import { useToast } from "../contexts/ToastContext";
import { useSubscribe } from "../hooks";
import { useAuthStore } from "../stores/authStore";
import adminDashboardService from "../services/adminDashboardService";
import TopBar from "../components/plans/TopBar";

const PlansSummaryScreen = () => {
  const { t, currentLanguage } = useTranslation("plans");
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const subscribeMutation = useSubscribe();
  const isArabic = currentLanguage === "ar";

  const { selectedPlan } = route.params || {};
  const token = useAuthStore((state) => state.token);

  const billingType = selectedPlan?.billingType || "event";

  const [discountCode, setDiscountCode]       = useState("");
  const [discountAmount, setDiscountAmount]   = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [validating, setValidating]           = useState(false);

  // Calculate totals
  const planPrice = parseFloat(selectedPlan?.price || selectedPlan?.pricing?.oneTime) || 0;
  const subtotal = planPrice;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Get plan display name using nameAr/nameEn
  const getPlanDisplayName = () => {
    if (isArabic) {
      return selectedPlan?.nameAr || (billingType === "monthly" ? "باقة شهرية" : "باقة مناسبة");
    }
    return selectedPlan?.nameEn || (billingType === "monthly" ? "Monthly Plan" : "Event Plan");
  };

  // Get billing type label
  const getBillingTypeLabel = () => {
    if (billingType === "monthly") return t("summary.unlimitedEvents");
    return t("summary.oneEvent");
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || validating) return;
    setValidating(true);
    try {
      const res = await adminDashboardService.discounts.validate(token, {
        code: discountCode.trim().toUpperCase(),
        amount: subtotal,
        planCode: selectedPlan?.code || null,
      });

      if (!res?.success) {
        setDiscountApplied(false);
        setDiscountAmount(0);
        toast.error(t("summary.invalidCode"));
        return;
      }

      const result = res?.data?.data;
      if (result?.valid) {
        setDiscountAmount(result.discountAmount || 0);
        setDiscountApplied(true);
        toast.success(
          t("summary.discountCode.success", {
            amount: (result.discountAmount || 0).toFixed(0),
          })
        );
      } else {
        setDiscountApplied(false);
        setDiscountAmount(0);
        toast.error(t("summary.invalidCode"));
      }
    } catch {
      setDiscountApplied(false);
      setDiscountAmount(0);
      toast.error(t("summary.invalidCode"));
    } finally {
      setValidating(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    try {
      const planCode = selectedPlan.code;

      await subscribeMutation.mutateAsync({
        planCode,
        ...(discountApplied && discountCode ? { discountCode: discountCode.trim() } : {}),
      });
      toast.success(t("toasts.success"));
      navigation.navigate("CreateEventScreen");
    } catch (error) {
      if (error.status === 400 && error.message?.includes("already have an active subscription")) {
        toast.info(t("summary.activeSubscription"));
        navigation.navigate("CreateEventScreen");
      } else {
        toast.error(t("toasts.failed"));
      }
    }
  };

  // Get compensation invites — monthly uses compensationPool, event uses 15% of invites
  const getCompensationInvites = () => {
    if (billingType === "monthly") {
      return selectedPlan?.compensationPool || Math.floor((selectedPlan?.invitePool || 0) * 0.15);
    }
    const invites = selectedPlan?.invites ?? selectedPlan?.limits?.maxInvitesPerEvent ?? 25;
    return Math.floor(invites * 0.15);
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
            {/* Plan Info */}
            <View style={styles.planInfo}>
              <View style={styles.planIcon}>
                <Ionicons name="calendar-outline" size={24} color="#C28E5C" />
              </View>
              <View style={styles.planDetails}>
                <Text style={styles.planName}>{getPlanDisplayName()}</Text>
                <Text style={styles.planType}>
                  {t("summary.singleEvent")}
                </Text>
              </View>
              <View style={styles.planPrice}>
                <Text style={styles.priceAmount}>{planPrice}</Text>
                <Text style={styles.priceCurrency}>
                  {t("summary.currency")}
                </Text>
              </View>
            </View>

            {/* Plan Features Summary */}
            <View style={styles.featuresSummary}>
              {billingType === "monthly" ? (
                <View style={styles.featureItem}>
                  <Ionicons name="people-outline" size={18} color="#C28E5C" />
                  <Text style={styles.featureText}>
                    {`${selectedPlan?.invitePool || 0} ${t("summary.invitePool") || t("inviteSelector.poolLabel")}`}
                  </Text>
                </View>
              ) : (
                <View style={styles.featureItem}>
                  <Ionicons name="people-outline" size={18} color="#C28E5C" />
                  <Text style={styles.featureText}>
                    {`${selectedPlan?.invites ?? selectedPlan?.limits?.maxInvitesPerEvent ?? 25} ${t("summary.invitesLabel")}`}
                  </Text>
                </View>
              )}
              <View style={styles.featureItem}>
                <Ionicons name="calendar-outline" size={18} color="#C28E5C" />
                <Text style={styles.featureText}>
                  {getBillingTypeLabel()}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="gift-outline" size={18} color="#C28E5C" />
                <Text style={styles.featureText}>
                  {getCompensationInvites()}{" "}
                  {t("summary.compensationInvites")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Discount Code Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              <Ionicons name="pricetag-outline" size={16} color="#2C2C2C" />{" "}
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
                autoCapitalize="characters"
                editable={!discountApplied}
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

        {/* Terms Notice */}
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
                {t("summary.activating")}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.proceedButtonText}>
                {t("summary.activateButton")}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  content: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
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
  managedBadge: {
    backgroundColor: "#8A6541",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  managedBadgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    color: "#FFF",
  },
  cardContent: {
    gap: 16,
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5ECE4",
    justifyContent: "center",
    alignItems: "center",
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#2C2C2C",
    marginBottom: 2,
  },
  planType: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#656565",
  },
  planPrice: {
    alignItems: "flex-end",
  },
  priceAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    color: "#C28E5C",
  },
  priceCurrency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#8A6541",
  },
  featuresSummary: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5ECE4",
    borderRadius: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#6B4E33",
  },
  billingPeriod: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billingLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#656565",
  },
  billingValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#2C2C2C",
  },
  discountInputWrapper: {
    flexDirection: "row",
    gap: 8,
  },
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
  discountInputApplied: {
    backgroundColor: "#F5ECE4",
    borderColor: "#C28E5C",
  },
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
  applyButtonDisabled: {
    backgroundColor: "#E5E7EA",
  },
  applyButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: "#FFF",
  },
  summaryBreakdown: {
    gap: 12,
  },
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
  totalRow: {
    paddingTop: 8,
  },
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
  proceedButtonDisabled: {
    backgroundColor: "#E5E7EA",
  },
  proceedButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
});

export default PlansSummaryScreen;
