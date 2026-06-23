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

  const [errors, setErrors] = useState({});

  const checkLuhn = (num) => {
    let sum = 0;
    let shouldDouble = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num.charAt(i), 10);
      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  };

  const validateSource = () => {
    const newErrors = {};
    if (paymentMethod === "creditcard") {
      const name = (cardData?.name || "").trim();
      const number = (cardData?.number || "").replace(/\D/g, "");
      const month = (cardData?.month || "").trim();
      const year = (cardData?.year || "").trim();
      const cvc = (cardData?.cvc || "").trim();

      if (!name) {
        newErrors.name = t("checkout.errors.nameRequired", "Cardholder name is required");
      } else if (name.length < 3) {
        newErrors.name = t("checkout.errors.nameTooShort", "Please enter full cardholder name");
      }

      if (!number) {
        newErrors.number = t("checkout.errors.numberRequired", "Card number is required");
      } else if (number.length < 15 || number.length > 16) {
        newErrors.number = t("checkout.errors.numberLength", "Card number must be 15 or 16 digits");
      } else if (!checkLuhn(number)) {
        newErrors.number = t("checkout.errors.numberInvalid", "Invalid card number");
      }

      if (!month || !year) {
        newErrors.expiry = t("checkout.errors.expiryRequired", "Expiry date is required");
      } else {
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        if (isNaN(m) || m < 1 || m > 12) {
          newErrors.expiry = t("checkout.errors.expiryMonthInvalid", "Invalid month (01-12)");
        } else if (isNaN(y) || y < currentYear || (y === currentYear && m < currentMonth)) {
          newErrors.expiry = t("checkout.errors.expiryExpired", "Card has expired");
        }
      }

      if (!cvc) {
        newErrors.cvc = t("checkout.errors.cvcRequired", "CVC is required");
      } else if (cvc.length < 3 || cvc.length > 4) {
        newErrors.cvc = t("checkout.errors.cvcLength", "CVC must be 3 or 4 digits");
      }
    } else if (paymentMethod === "stcpay") {
      const mobile = (stcMobile || "").replace(/\D/g, "");
      if (!mobile) {
        newErrors.stcMobile = t("checkout.errors.mobileRequired", "Mobile number is required");
      } else if (!/^(05|5)\d{8}$/.test(mobile)) {
        newErrors.stcMobile = t("checkout.errors.mobileFormat", "Must be a valid Saudi number (e.g. 05xxxxxxxx)");
      }
    } else if (paymentMethod === "applepay") {
      newErrors.applepay = t("checkout.errors.applepayUnavailable", "Apple Pay is currently unavailable");
      toast.error(t("checkout.errors.applepayUnavailable"));
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    if (!validateSource()) {
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
        // useCheckout ran the 3DS step in an in-app browser that has now
        // closed. Hand off to the polling screen, which confirms the
        // payment and routes onward per its purpose. Don't toast a fake
        // success — the charge isn't terminal yet.
        navigation.navigate("PaymentReturn", { moyasarId: result.moyasarId });
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
      navigation.navigate("MainTabs", { screen: "Home" });
    } catch (error) {
      // Surface the real reason instead of masking every failure behind the
      // generic fallback. Three distinct cases must stay distinguishable:
      //   - backend rejected the charge  -> error.data.message
      //   - 3DS in-app browser failed    -> error.code === THREE_DS_LAUNCH_FAILED
      //     (the Expo Go custom-scheme limitation; needs a dev/standalone build)
      //   - anything else                -> error.message
      // The console line keeps the raw cause visible in Metro/QA logs.
      // eslint-disable-next-line no-console
      console.error("[checkout] payment failed", {
        code: error?.code,
        status: error?.status,
        message: error?.message,
        data: error?.data,
        cause: error?.cause?.message || error?.cause,
      });
      const detail =
        error?.data?.message || error?.message || t("toasts.subscriptionFailed");
      toast.error(detail);
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
            addonItems={addonItems}
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
                onChange={(m) => {
                  setPaymentMethod(m);
                  setErrors({});
                }}
                onCardChange={setCardData}
                onMobileChange={setStcMobile}
                cardData={cardData}
                stcMobile={stcMobile}
                errors={errors}
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
