import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useSubscribe } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import adminDashboardService from "../../services/adminDashboardService";
import TopBar from "../../components/plans/TopBar";
import PlanSummaryCard from "../../components/plans/PlanSummaryCard";
import DiscountCodeCard from "../../components/plans/DiscountCodeCard";
import PaymentSummaryCard from "../../components/plans/PaymentSummaryCard";

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

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [validating, setValidating] = useState(false);

  const planPrice =
    parseFloat(selectedPlan?.price || selectedPlan?.pricing?.oneTime) || 0;
  const subtotal = planPrice;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || validating) return;
    setValidating(true);
    try {
      const res = await adminDashboardService.discounts.validate(token, {
        code: discountCode.trim().toUpperCase(),
        amount: subtotal,
        planType: selectedPlan?.code || null,
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
        ...(discountApplied && discountCode
          ? { discountCode: discountCode.trim() }
          : {}),
      });
      toast.success(t("toasts.success"));
      navigation.navigate("CreateEventScreen");
    } catch (error) {
      if (
        error.status === 400 &&
        error.message?.includes("already have an active subscription")
      ) {
        toast.info(t("summary.activeSubscription"));
        navigation.navigate("CreateEventScreen");
      } else {
        toast.error(t("toasts.failed"));
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
          <PlanSummaryCard
            selectedPlan={selectedPlan}
            billingType={billingType}
            isArabic={isArabic}
            planPrice={planPrice}
            t={t}
          />

          <DiscountCodeCard
            discountCode={discountCode}
            discountApplied={discountApplied}
            validating={validating}
            onCodeChange={setDiscountCode}
            onApply={handleApplyDiscount}
            t={t}
          />

          <PaymentSummaryCard
            planPrice={planPrice}
            discountAmount={discountAmount}
            finalTotal={finalTotal}
            t={t}
          />

          <Text style={styles.termsNotice}>{t("summary.termsNotice")}</Text>
        </ScrollView>

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
  proceedButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
});

export default PlansSummaryScreen;
