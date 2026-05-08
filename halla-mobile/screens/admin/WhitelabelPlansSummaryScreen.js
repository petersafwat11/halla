import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useSubscribe, useValidateDiscount } from "../../hooks";
import TopBar from "../../components/plans/TopBar";
import { PlanSummaryCard, DiscountCodeCard, PaymentSummaryCard } from "../../components/plans/SummaryCards";
import { getLocalized } from "../../utils/locale";

const WhitelabelPlansSummaryScreen = () => {
  const { t, currentLanguage } = useTranslation("plans");
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const subscribeMutation = useSubscribe();
  const validateDiscount = useValidateDiscount();

  const { selectedPlan } = route.params || {};

  const [discountCode, setDiscountCode] = useState("");
  const [discountData, setDiscountData] = useState(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const validating = validateDiscount.isPending;

  const planPrice = parseFloat(selectedPlan?.pricing?.oneTime) || 0;
  const discountAmt = discountData?.discountAmount || 0;
  const finalTotal = Math.max(0, planPrice - discountAmt);

  const getPlanDisplayName = useCallback(
    () => getLocalized(selectedPlan, "name", currentLanguage),
    [currentLanguage, selectedPlan],
  );

  const getBillingPeriod = useCallback(() => {
    const days = selectedPlan?.limits?.durationDays;
    if (days === 365) return "summary.periods.yearly";
    if (days === 90) return "summary.periods.quarterly";
    if (days === 30) return "summary.periods.monthly";
    return "summary.periods.custom";
  }, [selectedPlan]);

  const handleApplyDiscount = useCallback(async () => {
    if (!discountCode.trim() || validating) return;
    try {
      // Pass the plan's planType when present, otherwise null — backend
      // treats null as "no plan-restriction" so platform-wide codes apply.
      const planTypeKey = selectedPlan?.planType || null;
      const body = await validateDiscount.mutateAsync({
        code: discountCode.trim().toUpperCase(),
        amount: planPrice,
        planType: planTypeKey,
      });

      const result = body?.data;
      if (result?.valid) {
        setDiscountData(result);
        setDiscountApplied(true);
        toast.success(
          t("summary.discount.success", {
            code: discountCode.trim().toUpperCase(),
            amount: result.discountAmount?.toFixed(0) ?? 0,
          }),
        );
      } else {
        setDiscountApplied(false);
        setDiscountData(null);
        toast.error(result?.reason || t("summary.invalidCode"));
      }
    } catch {
      setDiscountApplied(false);
      setDiscountData(null);
      toast.error(t("summary.invalidCode"));
    }
  }, [discountCode, validating, planPrice, selectedPlan, toast, t, validateDiscount]);

  const handlePayment = useCallback(async () => {
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
      } else if (error.status === 400 && error.message?.includes("Payment failed")) {
        toast.error(t("summary.paymentFailed"));
      } else if (error.status === 400 && error.message?.includes("Invalid plan code")) {
        toast.error(t("summary.invalidPlan"));
      } else {
        toast.error(t("summary.subscriptionFailed"));
      }
    }
  }, [selectedPlan, discountCode, subscribeMutation, toast, t, navigation]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("summary.title")} showBack={true} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PlanSummaryCard
            planName={t("summary.planDetails")}
            planType={getPlanDisplayName()}
            planPrice={planPrice}
            currency={t("summary.currency")}
            inviteInfo={selectedPlan?.limits?.invitePool != null ? (
              <View style={styles.featureItem}>
                <Ionicons name="people-outline" size={18} color="#C28E5C" />
                <Text style={styles.featureText}>
                  {(selectedPlan.limits.invitePool).toLocaleString()}{" "}
                  {t("summary.invitePool")}
                </Text>
              </View>
            ) : selectedPlan?.limits?.maxInvitesPerEvent != null ? (
              <View style={styles.featureItem}>
                <Ionicons name="people-outline" size={18} color="#C28E5C" />
                <Text style={styles.featureText}>
                  {selectedPlan.limits.maxInvitesPerEvent}{" "}
                  {t("eventTab.invitesSuffix")}
                </Text>
              </View>
            ) : null}
            validityInfo={
              <View style={styles.featureItem}>
                <Ionicons name="time-outline" size={18} color="#C28E5C" />
                <Text style={styles.featureText}>
                  {t("summary.validFor")}{" "}
                  {selectedPlan?.limits?.durationDays ?? 0}{" "}
                  {t("summary.days")}
                </Text>
              </View>
            }
            billingPeriod={t("summary.billingPeriod")}
            billingValue={t(getBillingPeriod())}
          />

          <DiscountCodeCard
            title={t("summary.discount.title")}
            discountCode={discountCode}
            onCodeChange={setDiscountCode}
            onApply={handleApplyDiscount}
            discountApplied={discountApplied}
            validating={validating}
            applyText={t("summary.discount.apply")}
            appliedText={t("summary.discount.applied")}
            placeholder={t("summary.discount.placeholder")}
          />

          <PaymentSummaryCard
            title={t("summary.paymentSummary.title")}
            planPrice={planPrice}
            discountAmt={discountAmt}
            finalTotal={finalTotal}
            currency={t("summary.currency")}
            planPriceLabel={t("summary.paymentSummary.planPrice")}
            discountLabel={t("summary.paymentSummary.discount")}
            totalLabel={t("summary.paymentSummary.total")}
          />

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
                  name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
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
  featureItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontFamily: "Cairo_600SemiBold", fontSize: 12, color: "#6B4E33" },
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
