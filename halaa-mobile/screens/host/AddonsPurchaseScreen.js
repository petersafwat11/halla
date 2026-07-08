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
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
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
import { canPurchase } from "../../services/purchases";
import { eligibleEntries, resolvePurchasable } from "../../services/billing/catalog";
import { disclosuresFor } from "../../services/billing/disclosures";
import TopBar from "../../components/plans/TopBar";
import PurchaseStatusModal from "../../components/plans/PurchaseStatusModal";
import StatusBadge from "../../components/admin-dashboard/common/StatusBadge";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const FAMILY_ORDER = ["extra_invites", "design_template", "business_customization"];

const AddonsPurchaseScreen = () => {
  const { t, currentLanguage } = useTranslation("plans");
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: catalogData } = useStoreCatalog();
  const { data: offeringsAll } = useAllOfferings();
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
    if (!canPurchase()) {
      toast.error(t("checkout.errors.iapUnavailable", "In-app purchases aren't available right now."));
      return;
    }
    const resolved = resolvePurchasable(catalogEntries, offeringsAll, entry.internalCode);
    if (!resolved.available) {
      toast.error(t("checkout.errors.addonUnavailable", "This add-on isn't available right now."));
      return;
    }
    flow.run({
      entry,
      pkg: resolved.pkg,
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
    const resolved = resolvePurchasable(catalogEntries, offeringsAll, entry.internalCode);
    return (
      <View key={entry.internalCode} style={styles.addonRow}>
        <View style={styles.addonInfo}>
          <Text style={styles.addonName} numberOfLines={2}>
            {localizedName(entry)}
          </Text>
          <Text style={styles.addonPrice}>
            {resolved.available ? resolved.priceString : t("checkout.iap.unavailable", "Unavailable")}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.buyBtn, (!resolved.available || flow.isBusy) && styles.buyBtnDisabled]}
          onPress={() => buyAddon(entry)}
          disabled={!resolved.available || flow.isBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.buyBtnText}>{t("addons.buy", "Buy")}</Text>
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
            <Text style={styles.pendingNoteText}>{t("addons.completePending")}</Text>
          </View>
        )}

        {FAMILY_ORDER.map((family) =>
          byFamily[family].length > 0 ? (
            <View key={family} style={styles.section}>
              <Text style={styles.sectionTitle}>{t(`addons.families.${family}`, family)}</Text>
              <Text style={styles.sectionDisclosure}>{t(disclosuresFor(byFamily[family][0])[1] || "disclosures.oneTime")}</Text>
              {byFamily[family].map(renderEntry)}
            </View>
          ) : null
        )}

        {byFamily.extra_invites.length === 0 &&
          byFamily.design_template.length === 0 &&
          byFamily.business_customization.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("addons.noneEligible", "No add-ons available for your plan.")}</Text>
            </View>
          )}

        {/* Fulfillment status of the last purchase (exact transaction). */}
        {lastTxn && fulfillment ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("addons.fulfillment.title", "Fulfillment status")}</Text>
            {fulfillment.addon ? (
              <View style={styles.fulfillRow}>
                <Text style={styles.fulfillLabel}>{t(`addons.families.${fulfillment.addon.addonType}`, fulfillment.addon.addonType)}</Text>
                <StatusBadge status={fulfillment.addon.status} size="small" />
              </View>
            ) : (
              <Text style={styles.sectionDisclosure}>{t("addons.fulfillment.pending", "Processing — your add-on will be applied shortly.")}</Text>
            )}
          </View>
        ) : null}

        {/* Recent add-on history. */}
        {Array.isArray(historyItems) && historyItems.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("addons.history.title", "Your add-ons")}</Text>
            {historyItems.slice(0, 8).map((a) => (
              <View key={a._id || a.id} style={styles.fulfillRow}>
                <Text style={styles.fulfillLabel} numberOfLines={1}>
                  {t(`addons.families.${a.addonType}`, a.addonType)}
                  {a.quantity ? ` · ${a.quantity}` : ""}
                </Text>
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
  buyBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius[8],
  },
  buyBtnDisabled: { backgroundColor: colors.primary[200] },
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
