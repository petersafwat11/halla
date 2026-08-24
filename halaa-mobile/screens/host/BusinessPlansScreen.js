import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "../../localization";
import LocalizedText from "../../components/commen/LocalizedText";

import TopBar from "../../components/plans/TopBar";
import CurrentPlanCard from "../../components/plans/CurrentPlanCard";
import BusinessPlanCard from "../../components/plans/BusinessPlanCard";
import AddonsSection from "../../components/plans/AddonsSection";
import { useBusinessPlans, useMySubscription } from "../../hooks";
import { isCurrentPlan } from "../../services/billing/currentPlan";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";

/**
 * Business-account plans screen (B4-MOBILE).
 *
 * The business equivalent of <PlansScreen>. Branched to from the "Plans" tab
 * by AppNavigator when `accountType === 'business'`. Business plans come from
 * the public `/plans/business` endpoint as `{ event:[], quarterly:[], annual:[] }`.
 *
 * UX rules (DEC-02 / MOB-04, signed 2026-07-01):
 *   - First self-serve purchase is ALLOWED for eligible business accounts on
 *     both web and mobile — no admin pre-activation required. A no-subscription
 *     business sees a "choose a plan to get started" intro (not a contact-admin
 *     lock) and can purchase directly.
 *   - Tapping a plan routes to the shared PlansSummary flow (native IAP on
 *     device, Moyasar on web).
 *
 * The current plan is matched by EXACT plan code (never `planType`) so two
 * business tiers that share a planType don't both read as "current" (P0-12).
 */

const BILLING_TIERS = ["event", "quarterly", "annual"];

const BusinessPlansScreen = () => {
  const { t } = useTranslation("plans");
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [billingTier, setBillingTier] = useState("quarterly");
  const [addonItems, setAddonItems] = useState([]);
  const [addonTotal, setAddonTotal] = useState(0);

  const {
    data: response,
    isLoading: plansLoading,
    error: plansError,
  } = useBusinessPlans();
  const {
    data: subscriptionData,
    isLoading: subLoading,
    error: subError,
  } = useMySubscription();

  const subscription = subscriptionData?.data?.subscription || null;
  const usage = subscription?.usage || null;
  const hasActiveSubscription = !!subscription;

  const isLoading = plansLoading || subLoading;
  const loadError = plansError || subError;

  const tierPlans = useMemo(
    () => {
      const plans = response?.data?.[billingTier];
      return Array.isArray(plans) ? plans.filter(Boolean) : [];
    },
    [response, billingTier]
  );

  const handleUpgrade = (plan) => {
    if (!plan) return;
    // Reuse the shared host checkout summary flow. Business plans are
    // single-tier (no invite slider), so `planFamily`/`invites` carry the
    // business-plan identity for the summary card and discount validation.
    navigation.navigate("PlansSummary", {
      selectedPlan: {
        ...plan,
        price: plan.price || plan.pricing?.oneTime || 0,
        planFamily: plan.planFamily || "business",
        billingType: plan.billingType || billingTier,
      },
      addonItems,
      addonTotal,
    });
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopBar title={t("business.pageTitle")} showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <LocalizedText style={styles.loadingText}>{t("loading")}</LocalizedText>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopBar title={t("business.pageTitle")} showBack={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error[500]} />
          <LocalizedText style={styles.errorText} center>
            {t("errors.loadFailed")}
          </LocalizedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.85}
          >
            <LocalizedText style={styles.retryButtonText}>
              {t("errors.retry")}
            </LocalizedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopBar title={t("business.pageTitle")} showBack={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CurrentPlanCard subscription={subscription} usage={usage} />

        {/* No active subscription → self-serve intro (DEC-02: first purchase is
            allowed; no admin-activation lock). */}
        {!hasActiveSubscription ? (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingIcon}>
              <Ionicons name="sparkles-outline" size={22} color={colors.primary[500]} />
            </View>
            <View style={styles.pendingTextWrap}>
              <LocalizedText style={styles.pendingTitle}>
                {t("business.getStarted.title")}
              </LocalizedText>
              <LocalizedText style={styles.pendingSubtitle}>
                {t("business.getStarted.subtitle")}
              </LocalizedText>
            </View>
          </View>
        ) : null}

        {/* Billing-tier toggle (event / quarterly / annual) */}
        <View style={styles.tierPills}>
          {BILLING_TIERS.map((tier) => {
            const active = billingTier === tier;
            return (
              <TouchableOpacity
                key={tier}
                style={[styles.tierPill, active && styles.tierPillActive]}
                onPress={() => setBillingTier(tier)}
                activeOpacity={0.7}
              >
                <LocalizedText
                  style={[
                    styles.tierPillText,
                    active && styles.tierPillTextActive,
                  ]}
                >
                  {t(`tabs.${tier}`)}
                </LocalizedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plan cards */}
        {tierPlans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LocalizedText style={styles.emptyText} center>
              {t(`${billingTier}Tab.noPlans`)}
            </LocalizedText>
          </View>
        ) : (
          tierPlans.map((plan) => (
            <BusinessPlanCard
              key={plan.id || plan.code}
              plan={plan}
              // EXACT-code current-plan match (never planType) — DEC-02/P0-12.
              isCurrent={hasActiveSubscription && isCurrentPlan(subscription, plan)}
              // First self-serve purchase allowed for eligible business accounts.
              canSelfUpgrade
              onUpgrade={handleUpgrade}
            />
          ))
        )}

        {/* Business add-ons (incl. branding customization). Attaches to the
            active subscription, so only shown to active subscribers. Selections
            ride the chosen plan into the PlansSummary checkout. */}
        {hasActiveSubscription ? (
          <AddonsSection
            showBusiness
            onAddonsChange={(items, sum) => {
              setAddonItems(items);
              setAddonTotal(sum);
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[500],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary[50],
    gap: spacing[12],
  },
  loadingText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary[50],
    gap: spacing[12],
    paddingHorizontal: spacing[20],
  },
  errorText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[700],
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius[12],
  },
  retryButtonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[50],
  },
  content: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[40],
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: colors.primary[100],
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: borderRadius[16],
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  pendingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  pendingTextWrap: {
    flex: 1,
    gap: 2,
  },
  pendingTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[700],
  },
  pendingSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[800],
    lineHeight: 20,
  },
  tierPills: {
    flexDirection: "row",
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius[12],
    padding: 4,
    marginBottom: spacing[16],
    gap: 4,
  },
  tierPill: {
    flex: 1,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius[8],
    alignItems: "center",
  },
  tierPillActive: {
    backgroundColor: colors.primary[500],
  },
  tierPillText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[800],
  },
  tierPillTextActive: {
    color: colors.natural[50],
  },
  emptyContainer: {
    padding: spacing[40],
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
  },
});

export default BusinessPlansScreen;
