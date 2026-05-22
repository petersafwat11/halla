import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useCheckout, useValidateDiscount } from "../../hooks";
import TopBar from "../../components/plans/TopBar";
import PlanSummaryCard from "../../components/plans/PlanSummaryCard";
import DiscountCodeCard from "../../components/plans/DiscountCodeCard";
import PaymentSummaryCard from "../../components/plans/PaymentSummaryCard";
import AddonsSummaryCard from "../../components/plans/AddonsSummaryCard";
import PaymentMethodSelector from "../../components/plans/PaymentMethodSelector";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const buildCheckoutAddons = (items = []) =>
  items.map((item) => {
    const type = item.addonType || item.type;
    const base = { addonType: type, scope: "org" };
    if (type === "extra_invites") {
      return { ...base, scope: "pool", quantity: item.quantity };
    }
    if (type === "extra_reminders") {
      return { ...base, quantity: item.quantity };
    }
    if (type === "design_template") {
      return { ...base, templateType: item.templateType };
    }
    return base;
  });

const PlansSummaryScreen = () => {
  const { t, currentLanguage } = useTranslation("plans");
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const checkoutMutation = useCheckout();
  const validateDiscount = useValidateDiscount();

  const { selectedPlan, addonItems = [], addonTotal = 0 } = route.params || {};

  const billingType = selectedPlan?.billingType || "event";

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [appliedCode, setAppliedCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("creditcard");
  const [cardData, setCardData] = useState(null);
  const [stcMobile, setStcMobile] = useState("");
  const validating = validateDiscount.isPending;

  // Mirror web's buildSource: { type, ...fields } per payment method.
  // Card fields stay strings (number/cvc) except month/year which Moyasar
  // expects as integers. The validation just below catches client-side
  // misses so we never POST an obviously-invalid source.
  const buildSource = () => {
    if (paymentMethod === "creditcard") {
      return {
        type: "creditcard",
        name: cardData?.name,
        number: cardData?.number,
        month: Number(cardData?.month),
        year: Number(cardData?.year),
        cvc: cardData?.cvc,
      };
    }
    if (paymentMethod === "stcpay") {
      return { type: "stcpay", mobile: stcMobile };
    }
    if (paymentMethod === "applepay") {
      return { type: "applepay", token: null };
    }
    return null;
  };

  const validateSource = () => {
    if (paymentMethod === "creditcard") {
      const name = cardData?.name?.trim();
      const number = cardData?.number?.trim();
      const month = cardData?.month?.trim();
      const year = cardData?.year?.trim();
      const cvc = cardData?.cvc?.trim();
      if (!name || !number || !month || !year || !cvc) {
        return t("checkout.errors.cardIncomplete");
      }
      if (number.length < 13 || number.length > 19) {
        return t("checkout.errors.cardNumberInvalid");
      }
      const m = Number(month);
      const y = Number(year);
      if (!m || m < 1 || m > 12 || !y || year.length !== 4) {
        return t("checkout.errors.expiryInvalid");
      }
      if (cvc.length < 3 || cvc.length > 4) {
        return t("checkout.errors.cvcInvalid");
      }
      return null;
    }
    if (paymentMethod === "stcpay") {
      // Web sends stcMobile raw with no format check — Moyasar is the
      // source of truth. We only block empty input here so we don't POST
      // a guaranteed-bad source to the gateway.
      if (!stcMobile?.trim()) {
        return t("checkout.errors.stcMobileInvalid");
      }
      return null;
    }
    if (paymentMethod === "applepay") {
      // PassKit wiring isn't shipped yet on mobile. Block the user with a
      // clear message until that's done, instead of failing silently at
      // the gateway with token:null.
      return t("checkout.errors.applepayUnavailable");
    }
    return null;
  };

  const planPrice = parseFloat(selectedPlan?.price) || 0;
  const subtotal = planPrice + (addonTotal || 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const checkoutAddons = useMemo(() => buildCheckoutAddons(addonItems), [addonItems]);

  const handleDiscountCodeChange = (value) => {
    setDiscountCode(value);
    if (discountError) setDiscountError("");
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || validating) return;
    setDiscountError("");
    try {
      // Validate against the bundled subtotal so the preview matches what
      // backend /payments/checkout charges. selectedPlan.planType is the
      // canonical PLAN_TYPES enum value the backend's applicablePlanTypes
      // matches against. Send the user's input verbatim — backend stores
      // codes uppercase but matches case-insensitively.
      const planTypeKey = selectedPlan?.planType || selectedPlan?.type || null;
      const body = await validateDiscount.mutateAsync({
        code: discountCode.trim(),
        amount: subtotal,
        planType: planTypeKey,
      });

      const result = body?.data;
      if (result?.valid) {
        const discount = result.discountAmount || 0;
        setDiscountAmount(discount);
        setDiscountApplied(true);
        setAppliedCode(discountCode.trim().toUpperCase());
      } else {
        setDiscountApplied(false);
        setDiscountAmount(0);
        setAppliedCode("");
        setDiscountError(result?.reason || t("summary.discount.invalidDefault"));
      }
    } catch {
      setDiscountApplied(false);
      setDiscountAmount(0);
      setAppliedCode("");
      setDiscountError(t("summary.discount.networkError"));
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode("");
    setDiscountAmount(0);
    setDiscountApplied(false);
    setAppliedCode("");
    setDiscountError("");
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    const sourceError = validateSource();
    if (sourceError) {
      toast.error(sourceError);
      return;
    }

    try {
      const result = await checkoutMutation.mutateAsync({
        planCode: selectedPlan.code,
        addons: checkoutAddons,
        ...(discountApplied && discountCode
          ? { discountCode: discountCode.trim() }
          : {}),
        source: buildSource(),
      });
      if (result?.requiresAction) {
        // useCheckout has already opened the redirect URL via Linking; the
        // user is mid-flow with the bank — don't toast a fake success.
        return;
      }
      const failedCount = result?.failedAddons?.length || 0;
      if (failedCount > 0) {
        toast.warning(
          t("toasts.subscriptionPartial", { count: failedCount })
        );
      } else {
        toast.success(t("toasts.subscriptionCreated"));
      }
      navigation.navigate("CreateEventScreen");
    } catch (error) {
      toast.error(error?.message || t("toasts.subscriptionFailed"));
    }
  };

  const isProcessing = checkoutMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("summary.title")} showBack={true} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.subtitleWrap}>
            <Text style={styles.subtitle}>{t("summary.subtitle")}</Text>
          </View>

          <PlanSummaryCard
            selectedPlan={selectedPlan}
            billingType={billingType}
            locale={currentLanguage}
            planPrice={planPrice}
            t={t}
          />

          <AddonsSummaryCard addonItems={addonItems} t={t} />

          <DiscountCodeCard
            discountCode={discountCode}
            applied={discountApplied}
            loading={validating}
            amount={discountAmount}
            appliedCode={appliedCode}
            errorMessage={discountError}
            onCodeChange={handleDiscountCodeChange}
            onApply={handleApplyDiscount}
            onRemove={handleRemoveDiscount}
            t={t}
          />

          <View style={styles.methodCard}>
            <View style={styles.methodCardHeader}>
              <Ionicons
                name="wallet-outline"
                size={16}
                color={colors.primary[500]}
              />
              <Text style={styles.methodCardTitle}>
                {t("summary.payment.method")}
              </Text>
            </View>
            <View style={styles.methodCardBody}>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                onCardChange={setCardData}
                onMobileChange={setStcMobile}
              />
            </View>
          </View>

          <PaymentSummaryCard
            planPrice={planPrice}
            discountAmount={discountAmount}
            finalTotal={finalTotal}
            t={t}
            addonTotal={addonTotal}
          />

          <View style={styles.secureRow}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={colors.primary[500]}
            />
            <Text style={styles.termsNotice}>{t("summary.termsNotice")}</Text>
          </View>
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.footerSafe}>
          <View style={styles.footer}>
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>
                {t("summary.paymentSummary.total")}
              </Text>
              <View style={styles.footerTotalAmountRow}>
                <Text style={styles.footerTotalAmount}>
                  {finalTotal.toFixed(0)}
                </Text>
                <Text style={styles.footerTotalCurrency}>
                  {t("summary.currency")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.proceedButton,
                isProcessing && styles.proceedButtonDisabled,
              ]}
              onPress={handlePayment}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color={colors.natural[50]} />
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
                    name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color={colors.natural[50]}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary[500],
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[100] + spacing[16],
  },
  subtitleWrap: {
    alignItems: "center",
    marginBottom: spacing[16],
  },
  subtitle: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    textAlign: "center",
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    marginTop: spacing[8],
    paddingHorizontal: spacing[12],
  },
  termsNotice: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    textAlign: "center",
    lineHeight: 18,
    flexShrink: 1,
  },
  methodCard: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    marginBottom: spacing[12],
    overflow: "hidden",
  },
  methodCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  methodCardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[900],
  },
  methodCardBody: {
    padding: spacing[16],
  },

  /* ---------- Footer ---------- */
  footerSafe: {
    backgroundColor: colors.natural[50],
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    backgroundColor: colors.natural[50],
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  footerTotal: {
    flexShrink: 1,
  },
  footerTotalLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
  },
  footerTotalAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing[4],
  },
  footerTotalAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
    color: colors.primary[700],
    letterSpacing: -0.3,
  },
  footerTotalCurrency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[600],
  },
  proceedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[12] + 2,
    paddingHorizontal: spacing[20],
    borderRadius: borderRadius[12],
    minWidth: 160,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  proceedButtonDisabled: {
    backgroundColor: colors.primary[200],
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[50],
  },
});

export default PlansSummaryScreen;
