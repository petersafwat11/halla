/**
 * AddonsPurchaseScreen (ADD-03) — standalone native add-on purchase + fulfillment.
 *
 * Lists the store-eligible add-ons the caller may buy (extra invites, design
 * templates, business customization), each purchased via its OWN store sheet
 * with add-on preflight + EXACT reconciliation (never a combined total). Shows
 * the fulfillment status/history of the last purchase (GET /revenuecat/
 * fulfillment) and the caller's recent add-on history. Consumable add-ons are
 * never presented as restorable durable entitlements (§9).
 */

import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import {
  useStoreCatalog,
  useAllOfferings,
  usePurchaseFlow,
  useFulfillment,
} from "../../hooks/purchases";
import { useMyAddons } from "../../hooks";
import { addonPreflight } from "../../services/billingApi";
import { canPurchase, isPurchasesAvailable } from "../../services/purchases";
import { eligibleEntries } from "../../services/billing/catalog";
import { getPurchaseReadiness, READINESS_STATES, readinessReasonKey } from "../../services/billing/purchaseReadiness";
import { disclosuresFor } from "../../services/billing/disclosures";
import AdaptiveText from "../../components/commen/AdaptiveText";
import LocalizedText from "../../components/commen/LocalizedText";
import { countToken } from "@halaa/shared/utils/displayTokens";
import { isolateLtr, isolateLtrTokens } from "@halaa/shared/utils/bidi";
import TopBar from "../../components/plans/TopBar";
import PurchaseStatusModal from "../../components/plans/PurchaseStatusModal";
import StatusBadge from "../../components/admin-dashboard/common/StatusBadge";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

// Intrinsically LTR tokens inside disclosure copy (store names / URLs).
const LTR_DISCLOSURE_TOKEN_REGEX =
  /App Store|Google Play|https?:\/\/[^\s)]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const FAMILY_ORDER = ["extra_invites", "design_template", "business_customization"];

const AddonsPurchaseScreen = () => {
  const { t, currentLanguage, isRTL } = useTranslation("plans");
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useStoreCatalog();
  const {
    data: offeringsAll,
    isLoading: isOfferingsLoading,
    error: offeringsError,
    refetch: refetchOfferings,
  } = useAllOfferings();
  const { data: myAddonsData } = useMyAddons();
  const flow = usePurchaseFlow();

  const [lastTxn, setLastTxn] = useState(null);
  const { data: fulfillment } = useFulfillment(lastTxn);

  const catalogEntries = catalogData?.entries || [];
  const pendingAddons = route.params?.pendingAddons || [];

  const byFamily = useMemo(() => {
    const groups = { extra_invites: [], design_template: [], business_customization: [] };
    for (const e of eligibleEntries(catalogEntries)) {
      if (e.catalogType === "addon" && groups[e.family]) groups[e.family].push(e);
    }
    groups.extra_invites.sort((a, b) => (a.tier || 0) - (b.tier || 0));
    return groups;
  }, [catalogEntries]);

  const localizedName = (entry) =>
    (currentLanguage === "ar" ? entry.nameAr : entry.nameEn) || entry.internalCode;

  const buyAddon = (entry) => {
    const readiness = getPurchaseReadiness({
      isConfigured: isPurchasesAvailable(),
      isUserIdentified: canPurchase(),
      isCatalogLoading,
      isOfferingsLoading,
      catalogError,
      offeringsError,
      entries: catalogEntries,
      offerings: offeringsAll,
      targetCode: entry.internalCode,
    });
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
          : t("checkout.errors.addonUnavailable")
      );
      return;
    }
    flow.run({
      entry,
      pkg: readiness.pkg,
      operation: "addon",
      preflight: () => addonPreflight(entry.internalCode),
    });
  };

  const onSuccessContinue = () => {
    const txn = flow.status?.result?.transactionId || null;
    if (txn) setLastTxn(txn);
    flow.reset();
    queryClient.invalidateQueries({ queryKey: ["addons"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  const historyItems = myAddonsData?.data?.addons || myAddonsData?.data || [];

  const renderEntry = (entry) => {
    const readiness = getPurchaseReadiness({
      isConfigured: isPurchasesAvailable(),
      isUserIdentified: canPurchase(),
      isCatalogLoading,
      isOfferingsLoading,
      catalogError,
      offeringsError,
      entries: catalogEntries,
      offerings: offeringsAll,
      targetCode: entry.internalCode,
    });
    const isAvailable = readiness.ready;
    const isLoading = readiness.state === READINESS_STATES.LOADING;
    const isRetryable = readiness.retryable;
    const terminalReasonKey =
      !isAvailable && !isLoading && !isRetryable
        ? readinessReasonKey(readiness.state)
        : null;
    const priceText = isAvailable
      ? isolateLtr(readiness.priceString)
      : isLoading
      ? "..."
      : t("checkout.iap.unavailable", "Unavailable");

    return (
      <View key={entry.internalCode} style={styles.addonRow}>
        <View style={styles.addonInfo}>
          <AdaptiveText style={styles.addonName} numberOfLines={2}>
            {localizedName(entry)}
          </AdaptiveText>
          {/* Mixed slot: LTR store price token, ellipsis, or localized
              unavailable copy — each follows its own script. */}
          <AdaptiveText style={styles.addonPrice}>
            {priceText}
          </AdaptiveText>
          {terminalReasonKey && (
            <LocalizedText style={styles.addonUnavailableReason} numberOfLines={2}>
              {t(terminalReasonKey)}
            </LocalizedText>
          )}
        </View>
        <TouchableOpacity
          style={[styles.buyBtn, (!isAvailable || flow.isBusy) && styles.buyBtnDisabled]}
          onPress={() => buyAddon(entry)}
          disabled={!isAvailable || flow.isBusy}
          activeOpacity={0.85}
        >
          <LocalizedText style={styles.buyBtnText}>{t("addons.buy")}</LocalizedText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopBar title={t("addons.title")} showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {pendingAddons.length > 0 && (
          <View style={styles.pendingNote}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary[600]} />
            <LocalizedText style={styles.pendingNoteText}>
              {t("addons.completePending")}
            </LocalizedText>
          </View>
        )}

        {FAMILY_ORDER.map((family) =>
          byFamily[family].length > 0 ? (
            <View key={family} style={styles.section}>
              <LocalizedText style={styles.sectionTitle}>
                {t(`addons.families.${family}`, family)}
              </LocalizedText>
              <LocalizedText style={styles.sectionDisclosure}>
                {
                  isolateLtrTokens(
                    t(disclosuresFor(byFamily[family][0])[1] || "disclosures.oneTime"),
                    LTR_DISCLOSURE_TOKEN_REGEX,
                    isRTL
                  )
                }
              </LocalizedText>
              {byFamily[family].map(renderEntry)}
            </View>
          ) : null
        )}

        {byFamily.extra_invites.length === 0 &&
          byFamily.design_template.length === 0 &&
          byFamily.business_customization.length === 0 && (
            <View style={styles.empty}>
              <LocalizedText style={styles.emptyText} center>
                {t("addons.noneEligible")}
              </LocalizedText>
            </View>
          )}

        {/* Fulfillment status of the last purchase (exact transaction). */}
        {lastTxn && fulfillment ? (
          <View style={styles.section}>
            <LocalizedText style={styles.sectionTitle}>
              {t("addons.fulfillment.title")}
            </LocalizedText>
            {fulfillment.addon ? (
              <View style={styles.fulfillRow}>
                <LocalizedText style={styles.fulfillLabel}>
                  {t(`addons.families.${fulfillment.addon.addonType}`, fulfillment.addon.addonType)}
                </LocalizedText>
                <StatusBadge status={fulfillment.addon.status} size="small" />
              </View>
            ) : (
              <LocalizedText style={styles.sectionDisclosure}>
                {t("addons.fulfillment.pending")}
              </LocalizedText>
            )}
          </View>
        ) : null}

        {/* Recent add-on history. */}
        {Array.isArray(historyItems) && historyItems.length > 0 ? (
          <View style={styles.section}>
            <LocalizedText style={styles.sectionTitle}>
              {t("addons.history.title")}
            </LocalizedText>
            {historyItems.slice(0, 8).map((a) => (
              <View key={a._id || a.id} style={styles.fulfillRow}>
                <LocalizedText style={styles.fulfillLabel} numberOfLines={1}>
                  {a.quantity
                    ? t("addons.history.itemRow", {
                        label: t(`addons.families.${a.addonType}`, a.addonType),
                        count: countToken(a.quantity, currentLanguage),
                      })
                    : t(`addons.families.${a.addonType}`, a.addonType)}
                </LocalizedText>
                <StatusBadge status={a.status} size="small" />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <PurchaseStatusModal
        status={flow.status}
        t={t}
        onClose={flow.reset}
        onRefresh={flow.refresh}
        onSuccessContinue={onSuccessContinue}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[500] },
  content: { flex: 1, backgroundColor: colors.primary[50] },
  scrollContent: { padding: spacing[20], paddingBottom: spacing[40] },
  pendingNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius[12],
    padding: spacing[12],
    marginBottom: spacing[16],
  },
  pendingNoteText: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[800],
  },
  section: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[900],
  },
  sectionDisclosure: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    marginTop: 2,
    marginBottom: spacing[8],
  },
  addonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[10],
    borderTopWidth: 1,
    borderTopColor: colors.natural[100],
  },
  addonInfo: { flex: 1 },
  addonName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[900],
  },
  addonPrice: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.label.small,
    color: colors.primary[600],
    marginTop: 2,
  },
  addonUnavailableReason: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[400],
    lineHeight: 14,
    marginTop: 2,
  },
  buyBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
  },
  buyBtnDisabled: { backgroundColor: colors.natural[300] },
  buyBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
  fulfillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
    paddingVertical: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.natural[100],
  },
  fulfillLabel: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[900],
  },
  empty: { padding: spacing[40], alignItems: "center" },
  emptyText: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    textAlign: "center",
  },
});

export default AddonsPurchaseScreen;
