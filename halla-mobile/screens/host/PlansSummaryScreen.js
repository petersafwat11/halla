import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useCheckout, useValidateDiscount } from "../../hooks";
import {
  useOffering,
  usePurchasePackage,
  useRestorePurchases,
} from "../../hooks/purchases";
import { isPurchasesAvailable, canPurchase } from "../../services/purchases";
import { apiFetch } from "../../services/http";
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

// Find the RevenueCat package that corresponds to our plan. Tries (in order):
// an explicit store product id carried on the plan, the package identifier ==
// plan code, then the product identifier == plan code. Configure RevenueCat
// packages accordingly (see IAP_SETUP.md).
const findPackageForPlan = (offering, plan) => {
  const packages = offering?.availablePackages;
  if (!packages?.length || !plan) return null;
  const code = plan.code;
  const productId =
    plan.iapProductId || plan.appleProductId || plan.googleProductId;
  return (
    (productId &&
      packages.find((p) => p.product?.identifier === productId)) ||
    packages.find((p) => p.identifier === code) ||
    packages.find((p) => p.product?.identifier === code) ||
    null
  );
};

// Deterministic store code for an add-on item (mirrors the backend
// parseAddonCode): extra_invites_<qty> | design_template_<type> |
// business_customization. RevenueCat packages must be configured with this as
// the package/product identifier (see docs/store-readiness-SKU-matrix.md).
const addonStoreCode = (addon) => {
  const type = addon.addonType || addon.type;
  if (type === "extra_invites") return `extra_invites_${addon.quantity}`;
  if (type === "design_template")
    return `design_template_${addon.templateType || addon.type}`;
  if (type === "business_customization") return "business_customization";
  return null;
};

const findPackageForAddon = (offering, addon) => {
  const packages = offering?.availablePackages;
  const code = addonStoreCode(addon);
  if (!packages?.length || !code) return null;
  return (
    packages.find((p) => p.identifier === code) ||
    packages.find((p) => p.product?.identifier === code) ||
    null
  );
};

const PlansSummaryScreen = () => {
  const { t, currentLanguage } = useTranslation("plans");
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const checkoutMutation = useCheckout();
  const validateDiscount = useValidateDiscount();

  // Platform gate: web keeps the Moyasar card checkout; iOS/Android must use
  // native in-app billing (App Store / Google Play) per store policy in KSA.
  const isWeb = Platform.OS === "web";
  const { data: offering } = useOffering();
  const purchaseMutation = usePurchasePackage();
  const restoreMutation = useRestorePurchases();

  const { selectedPlan, addonItems = [], addonTotal = 0 } = route.params || {};

  const billingType = selectedPlan?.billingType || "event";

  // The store package + its display price. On native we show the store's
  // priceString (the ACTUAL charged amount) — never the backend SAR (§9.3).
  const storePkg = useMemo(
    () => (isWeb ? null : findPackageForPlan(offering, selectedPlan)),
    [isWeb, offering, selectedPlan]
  );
  const storePriceString = storePkg?.product?.priceString || null;

  // Store-specific Manage/Cancel deep link (App Store / Google Play) — required
  // by App Review and surfaced next to Restore on native.
  const openStoreManager = () => {
    const url =
      Platform.OS === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : "https://play.google.com/store/account/subscriptions";
    Linking.openURL(url).catch(() => {});
  };

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

  // Native in-app purchase (iOS/Android). Buys the plan's store product via
  // RevenueCat; the backend webhook grants the subscription. Note: store IAPs
  // are fixed SKUs, so add-ons and discount codes (web/Moyasar features) are
  // not bundled here — see IAP_SETUP.md.
  // Wait for the backend to grant access (webhook → reconcile) before showing
  // success, so entitlement state is canonical rather than optimistic (§9.3).
  const reconcileBackend = async (attempts = 8, delayMs = 1500) => {
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await apiFetch("/payments/revenuecat/reconcile", {
          method: "GET",
        });
        const body = await res.json().catch(() => ({}));
        const data = body?.data || body;
        if (data?.hasBackendAccess) return true;
      } catch {
        /* keep polling */
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  };

  const handleNativePurchase = async () => {
    if (!selectedPlan) return;
    // Gate on an IDENTIFIED, signed-in RevenueCat user (§9.1) — never purchase
    // on an anonymous id.
    if (!canPurchase()) {
      toast.error(
        t("checkout.errors.iapUnavailable", "In-app purchases aren't available right now.")
      );
      return;
    }
    const pkg = findPackageForPlan(offering, selectedPlan);
    if (!pkg) {
      toast.error(t("checkout.errors.planUnavailable", "This plan isn't available for purchase right now."));
      return;
    }
    try {
      await purchaseMutation.mutateAsync(pkg);
      // No optimistic success — confirm the backend grant first.
      const granted = await reconcileBackend();

      // Buy each selected add-on as its own store product. Done AFTER the plan
      // is granted so pool/org add-ons attach to the new subscription. IAP has
      // no multi-product basket, so each add-on opens its own store sheet.
      let addonFailures = 0;
      for (const addon of addonItems) {
        const apkg = findPackageForAddon(offering, addon);
        if (!apkg) {
          addonFailures += 1;
          continue;
        }
        try {
          await purchaseMutation.mutateAsync(apkg);
        } catch (addonErr) {
          if (!addonErr?.userCancelled) addonFailures += 1;
        }
      }

      if (addonFailures > 0) {
        toast.info(
          t(
            "checkout.iap.addonsPartial",
            "Plan active. Some add-ons couldn't be purchased — you can buy them later."
          )
        );
      } else {
        toast[granted ? "success" : "info"](
          granted
            ? t("toasts.subscriptionCreated")
            : t("checkout.iap.processing", "Purchase received — your plan will activate shortly.")
        );
      }
      navigation.navigate("MainTabs", { screen: "Home" });
    } catch (error) {
      // RevenueCat flags user-initiated cancellation — not an error to surface.
      if (error?.userCancelled) return;
      // eslint-disable-next-line no-console
      console.error("[iap] purchase failed", { message: error?.message });
      toast.error(error?.message || t("toasts.subscriptionFailed"));
    }
  };

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync();
      await reconcileBackend(4, 1500);
      toast.success(t("checkout.iap.restored", "Purchases restored"));
    } catch (error) {
      toast.error(error?.message || t("checkout.iap.restoreFailed", "Could not restore purchases"));
    }
  };

  const isProcessing = isWeb
    ? checkoutMutation.isPending
    : purchaseMutation.isPending;

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

          {/* Discount codes apply only to the web/Moyasar checkout — store
              IAPs don't support arbitrary codes (use App Store / Play offer
              codes instead). */}
          {isWeb && (
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
          )}

          {isWeb ? (
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
          ) : (
            <View style={styles.methodCard}>
              <View style={styles.methodCardBody}>
                <View style={styles.iapNoteRow}>
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color={colors.primary[500]}
                  />
                  <Text style={styles.iapNoteText}>
                    {t(
                      "checkout.iap.note",
                      Platform.OS === "ios"
                        ? "Billed securely through the App Store."
                        : "Billed securely through Google Play."
                    )}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={handleRestore}
                  disabled={restoreMutation.isPending}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="refresh"
                    size={15}
                    color={colors.primary[600]}
                  />
                  <Text style={styles.restoreButtonText}>
                    {restoreMutation.isPending
                      ? t("checkout.iap.restoring", "Restoring...")
                      : t("checkout.iap.restore", "Restore Purchases")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={openStoreManager}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="settings-outline"
                    size={15}
                    color={colors.primary[600]}
                  />
                  <Text style={styles.restoreButtonText}>
                    {t("checkout.iap.manage", "Manage subscription")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                {!isWeb && storePriceString ? (
                  // Native: the store's actual charged price (priceString).
                  <Text style={styles.footerTotalAmount}>{storePriceString}</Text>
                ) : (
                  <>
                    <Text style={styles.footerTotalAmount}>
                      {finalTotal.toFixed(0)}
                    </Text>
                    <Text style={styles.footerTotalCurrency}>
                      {t("summary.currency")}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.proceedButton,
                isProcessing && styles.proceedButtonDisabled,
              ]}
              onPress={isWeb ? handlePayment : handleNativePurchase}
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
  iapNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  iapNoteText: {
    flexShrink: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    marginTop: spacing[12],
    paddingVertical: spacing[8],
  },
  restoreButtonText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[600],
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
