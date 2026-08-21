import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useCheckout, useValidateDiscount, useMySubscription } from "../../hooks";
import {
  useAllOfferings,
  useStoreCatalog,
  useRestorePurchases,
  usePurchaseFlow,
} from "../../hooks/purchases";
import { canPurchase, isPurchasesAvailable } from "../../services/purchases";
import { eventPreflight, reconcileGeneric } from "../../services/billingApi";
import { getEntry } from "../../services/billing/catalog";
import { getPurchaseReadiness, READINESS_STATES, readinessReasonKey } from "../../services/billing/purchaseReadiness";
import { classifyChange, selectReplacementMode, isDeferredChange } from "../../services/billing/changeMode";
import { subscriptionCode } from "../../services/billing/currentPlan";
import { isRestorable, showsManageSubscription } from "../../services/billing/disclosures";
import TopBar from "../../components/plans/TopBar";
import PlanSummaryCard from "../../components/plans/PlanSummaryCard";
import DiscountCodeCard from "../../components/plans/DiscountCodeCard";
import PaymentSummaryCard from "../../components/plans/PaymentSummaryCard";
import AddonsSummaryCard from "../../components/plans/AddonsSummaryCard";
import PaymentMethodSelector from "../../components/plans/PaymentMethodSelector";
import PurchaseStatusModal from "../../components/plans/PurchaseStatusModal";
import DisclosureList from "../../components/plans/DisclosureList";
import PurchaseLegalLinks from "../../components/plans/PurchaseLegalLinks";
import DirectionalIonicon from "../../components/common/DirectionalIonicon";
import { formatSar, round2, validateCardExpiry, checkLuhn, buildCreditCardSource } from "@halaa/shared/utils";
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

  // Platform gate: web keeps the Moyasar card checkout; iOS/Android must use
  // native in-app billing (App Store / Google Play) per store policy in KSA.
  const isWeb = Platform.OS === "web";
  const {
    data: offeringsAll,
    isLoading: isOfferingsLoading,
    error: offeringsError,
    refetch: refetchOfferings,
  } = useAllOfferings();
  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useStoreCatalog();
  const { data: subscriptionData } = useMySubscription();
  const restoreMutation = useRestorePurchases();
  const flow = usePurchaseFlow();

  const { selectedPlan, addonItems = [], addonTotal = 0 } = route.params || {};

  const billingType = selectedPlan?.billingType || "event";

  const catalogEntries = catalogData?.entries || [];
  const subscription = subscriptionData?.data?.subscription || null;

  // Discrete 10-state purchase readiness model (Phase 5A / §5.5).
  // The display price comes ONLY from the store package; a missing package
  // disables the CTA with a safe unavailable/retry state — never a backend price.
  const storeEntry = useMemo(
    () => (isWeb ? null : getEntry(catalogEntries, selectedPlan?.code)),
    [isWeb, catalogEntries, selectedPlan]
  );
  const readiness = useMemo(() => {
    if (isWeb) {
      return {
        state: READINESS_STATES.READY,
        ready: true,
        entry: null,
        pkg: null,
        priceString: null,
        retryable: false,
      };
    }
    return getPurchaseReadiness({
      isConfigured: isPurchasesAvailable(),
      isUserIdentified: canPurchase(),
      isCatalogLoading,
      isOfferingsLoading,
      catalogError,
      offeringsError,
      entries: catalogEntries,
      offerings: offeringsAll,
      targetCode: selectedPlan?.code,
    });
  }, [
    isWeb,
    isCatalogLoading,
    isOfferingsLoading,
    catalogError,
    offeringsError,
    catalogEntries,
    offeringsAll,
    selectedPlan,
  ]);
  const storePriceString = readiness.priceString;
  const storeAvailable = readiness.ready;
  // Terminal non-ready states show the precise localized reason (plan §5A);
  // loading shows a spinner, retryable states show a retry action instead.
  const terminalReasonKey =
    !storeAvailable &&
    readiness.state !== READINESS_STATES.LOADING &&
    !readiness.retryable
      ? readinessReasonKey(readiness.state)
      : null;

  // Privacy-safe readiness telemetry (plan §5B.8): state/counts only —
  // never keys, receipts, phone/email, or RevenueCat customer data.
  useEffect(() => {
    if (isWeb || readiness.state === READINESS_STATES.READY) return;
    try {
      Sentry.addBreadcrumb({
        category: "purchase.readiness",
        message: `state=${readiness.state}`,
        level: readiness.retryable ? "warning" : "error",
        data: {
          state: readiness.state,
          retryable: readiness.retryable,
          catalogEntries: catalogEntries.length,
          offeringsPackages:
            offeringsAll?.availablePackages?.length ?? null,
          targetCode: selectedPlan?.code || null,
        },
      });
    } catch (_) {
      // Telemetry must never break the purchase surface.
    }
  }, [isWeb, readiness.state, readiness.retryable, catalogEntries.length, offeringsAll, selectedPlan]);

  // Subscription change classification → Google replacement mode (P0-07/MOB-02).
  const currentEntry = useMemo(
    () => getEntry(catalogEntries, subscriptionCode(subscription)),
    [catalogEntries, subscription]
  );
  const changeType = useMemo(
    () => classifyChange(currentEntry, storeEntry),
    [currentEntry, storeEntry]
  );
  const changeInfo = useMemo(() => {
    if (isWeb || changeType === "new" || !currentEntry) return null;
    return {
      oldProductIdentifier: currentEntry.androidProductId,
      replacementMode: selectReplacementMode(changeType),
    };
  }, [isWeb, changeType, currentEntry]);

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
  const buildSource = () => {
    if (paymentMethod === "creditcard") {
      return buildCreditCardSource(cardData || {});
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

      const expiryCheck = validateCardExpiry(month, year);
      if (!expiryCheck.valid) {
        newErrors.expiry = t(expiryCheck.errorKey, "Invalid expiry date");
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
    if (isProcessing) return;
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
        expectedAmount: finalTotal,
        expectedTotal: finalTotal,
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
  // RevenueCat, then reconciles the EXACT attempted purchase (catalogCode +
  // store transaction) — success ONLY when that exact item is fulfilled, never
  // from generic access (P0-02). Idempotent: usePurchaseFlow ignores re-taps
  // while a run is in flight. Add-ons are completed on the dedicated Add-ons
  // screen after the plan is active (each with its own preflight + reconcile).
  const runNativePurchase = () => {
    if (!readiness.ready) {
      if (readiness.state === READINESS_STATES.LOADING) return;
      if (readiness.retryable) {
        refetchCatalog();
        refetchOfferings();
        return;
      }
      // Name the precise non-secret blocker instead of a generic label.
      const reasonKey = readinessReasonKey(readiness.state);
      toast.error(
        reasonKey
          ? t(reasonKey)
          : t("checkout.errors.planUnavailable", "This plan isn't available for purchase right now.")
      );
      return;
    }
    const isEvent = storeEntry.kind === "event_consumable";
    flow.run({
      entry: storeEntry,
      pkg: readiness.pkg,
      operation: changeType !== "new" ? "change" : "purchase",
      changeInfo,
      // A deferred downgrade won't be active until renewal — don't poll for it.
      deferred: isDeferredChange(changeType),
      preflight: isEvent ? () => eventPreflight(storeEntry.internalCode) : null,
    });
  };

  const onPurchaseSuccessContinue = () => {
    flow.reset();
    if (!isWeb && addonItems.length > 0) {
      navigation.navigate("AddonsPurchase", { pendingAddons: addonItems });
      return;
    }
    navigation.navigate("MainTabs", { screen: "Home" });
  };

  const handleRestore = async () => {
    try {
      await restoreMutation.mutateAsync();
      // Subscriptions restore via the store; consumables are NOT restorable —
      // reconcile the authoritative backend ledger after (§9).
      await reconcileGeneric();
      toast.success(t("checkout.iap.restored", "Purchases restored"));
    } catch (error) {
      toast.error(error?.message || t("checkout.iap.restoreFailed", "Could not restore purchases"));
    }
  };

  const isProcessing = isWeb ? checkoutMutation.isPending : flow.isBusy;
  const nativeUnavailable = !isWeb && (!readiness.ready || readiness.state === READINESS_STATES.LOADING);
  const nativeLoading = !isWeb && readiness.state === READINESS_STATES.LOADING;
  const nativeRetryable = !isWeb && readiness.retryable;

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
            priceDisplay={!isWeb ? storePriceString : null}
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
                {/* Restore is for subscriptions only — consumables/add-ons are
                    not restorable durable entitlements (§9). */}
                {isRestorable(storeEntry) && (
                  <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={handleRestore}
                    disabled={restoreMutation.isPending}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={15} color={colors.primary[600]} />
                    <Text style={styles.restoreButtonText}>
                      {restoreMutation.isPending
                        ? t("checkout.iap.restoring", "Restoring...")
                        : t("checkout.iap.restore", "Restore Purchases")}
                    </Text>
                  </TouchableOpacity>
                )}
                {/* Manage Subscription only for recurring products (§5.4). */}
                {showsManageSubscription(storeEntry) && (
                  <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={openStoreManager}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={15} color={colors.primary[600]} />
                    <Text style={styles.restoreButtonText}>
                      {t("checkout.iap.manage", "Manage subscription")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Store disclosures + legal links (native purchase surface — §7). */}
          {!isWeb && storeEntry ? <DisclosureList entry={storeEntry} t={t} /> : null}

          {/* Backend SAR totals are the Moyasar (web) breakdown — hidden on
              native, where the store package price is authoritative (P0-13). */}
          {isWeb && (
            <PaymentSummaryCard
              planPrice={planPrice}
              discountAmount={discountAmount}
              finalTotal={finalTotal}
              t={t}
              addonTotal={addonTotal}
            />
          )}

          <View style={styles.secureRow}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={colors.primary[500]}
            />
            <Text style={styles.termsNotice}>{t("summary.termsNotice")}</Text>
          </View>

          {!isWeb && <PurchaseLegalLinks t={t} lang={currentLanguage} />}
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.footerSafe}>
          <View style={styles.footer}>
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>
                {t("summary.paymentSummary.total")}
              </Text>
              <View style={styles.footerTotalAmountRow}>
                {!isWeb ? (
                  // Native: the store's actual charged price (priceString). If the
                  // package is missing, show unavailable/retry — never a backend price.
                  nativeLoading ? (
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                  ) : nativeRetryable ? (
                    <TouchableOpacity
                      onPress={() => {
                        refetchCatalog();
                        refetchOfferings();
                      }}
                    >
                      <Text style={styles.footerRetryText}>
                        {t("common.retry", "إعادة المحاولة")}
                      </Text>
                    </TouchableOpacity>
                  ) : storePriceString ? (
                    <Text style={styles.footerTotalAmount}>{storePriceString}</Text>
                  ) : (
                    <View style={styles.footerUnavailableWrap}>
                      <Text style={styles.footerUnavailable}>
                        {t("checkout.iap.unavailable", "Unavailable")}
                      </Text>
                      {terminalReasonKey && (
                        <Text style={styles.footerUnavailableReason}>
                          {t(terminalReasonKey)}
                        </Text>
                      )}
                    </View>
                  )
                ) : (
                  <>
                    <Text style={styles.footerTotalAmount}>
                      {formatSar(finalTotal, { trimTrailingZeros: true })}
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
                (isProcessing || nativeUnavailable) && styles.proceedButtonDisabled,
              ]}
              onPress={isWeb ? handlePayment : runNativePurchase}
              disabled={isProcessing || nativeUnavailable}
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
                  <DirectionalIonicon
                    name="chevron-forward"
                    size={18}
                    color={colors.natural[50]}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Native purchase lifecycle: preflight → purchase → exact reconcile.
            Renders the deterministic states with safe AR/EN copy. */}
        {!isWeb && (
          <PurchaseStatusModal
            status={flow.status}
            t={t}
            onClose={flow.reset}
            onRefresh={flow.refresh}
            onSuccessContinue={onPurchaseSuccessContinue}
          />
        )}
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
    alignItems: "flex-start",
    justifyContent: "center",
    gap: spacing[6],
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
  footerUnavailable: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
  footerUnavailableWrap: {
    alignItems: "flex-start",
    maxWidth: 160,
  },
  footerUnavailableReason: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    lineHeight: 14,
    marginTop: 2,
  },
  footerRetryText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[600],
    textDecorationLine: "underline",
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
    backgroundColor: colors.natural[300],
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
