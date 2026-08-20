import React, { useState, useEffect, useMemo } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "../../localization";

import TopBar from "../../components/plans/TopBar";
import DirectionalIonicon from "../../components/common/DirectionalIonicon";
import CurrentPlanCard from "../../components/plans/CurrentPlanCard";
import HostPlanCard from "../../components/plans/HostPlanCard";
import AddonsSection from "../../components/plans/AddonsSection";
import { useHostPlans, useMySubscription } from "../../hooks";
import { getInviteValue } from "../../components/plans/_components/InviteSelector";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";

const PlansScreen = () => {
  const { t } = useTranslation("plans");
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [billingType, setBillingType] = useState("event");
  const [selectedInvites, setSelectedInvites] = useState(null);
  const [addonItems, setAddonItems] = useState([]);
  const [addonTotal, setAddonTotal] = useState(0);
  const [showAddons, setShowAddons] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState("basic");

  const {
    data: response,
    isLoading: plansLoading,
    error: plansError,
  } = useHostPlans();
  const {
    data: subscriptionData,
    isLoading: subLoading,
    error: subError,
  } = useMySubscription();
  const subscription = subscriptionData?.data?.subscription || null;
  const usage = subscription?.usage || null;

  const isLoading = plansLoading || subLoading;
  const loadError = plansError || subError;

  // Defensive: trial/unlimited are never store products and must never render as
  // purchasable cards (§2). They are not in the basic/premium groups the API
  // returns, but we drop them explicitly regardless.
  const STORE_HIDDEN = useMemo(() => new Set(["trial", "unlimited"]), []);
  const basicPlans = useMemo(
    () => {
      const plans = response?.data?.basic?.[billingType];
      return (Array.isArray(plans) ? plans : []).filter(
        (p) => p && !STORE_HIDDEN.has(p.planType)
      );
    },
    [response, billingType, STORE_HIDDEN]
  );
  const premiumPlans = useMemo(
    () => {
      const plans = response?.data?.premium?.[billingType];
      return (Array.isArray(plans) ? plans : []).filter(
        (p) => p && !STORE_HIDDEN.has(p.planType)
      );
    },
    [response, billingType, STORE_HIDDEN]
  );

  // Default the shared invite count whenever billing type changes or data loads
  useEffect(() => {
    const reference = basicPlans[0] || premiumPlans[0];
    if (reference) {
      setSelectedInvites(getInviteValue(reference, billingType));
    } else {
      setSelectedInvites(null);
    }
  }, [billingType, basicPlans, premiumPlans]);

  // Compensation count is rendered inside <PlanDescription> via the
  // COMPENSATION_PERCENTAGE constant. Feature bullets come from each plan's
  // `featureBullets` map (Arabic / English).

  const handleAddonsChange = (items, total) => {
    setAddonItems(items);
    setAddonTotal(total);
  };

  const handleSubscribe = (planFamily, plan) => {
    if (!plan) return;
    setSelectedFamily(planFamily);
    setSelectedPlan(plan);
    setShowAddons(true);
  };

  const handleContinueToSummary = () => {
    navigation.navigate("PlansSummary", {
      selectedPlan: {
        ...selectedPlan,
        price: selectedPlan?.price || 0,
        invites: selectedInvites,
        planFamily: selectedFamily,
        billingType,
      },
      addonItems,
      addonTotal,
    });
  };

  const handleBackToPlans = () => {
    setShowAddons(false);
    setSelectedPlan(null);
    setSelectedFamily("basic");
  };

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopBar title={t("pageTitle")} showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>{t("loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopBar title={t("pageTitle")} showBack={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error[500]} />
          <Text style={styles.errorText}>{t("errors.loadFailed")}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.85}
          >
            <Text style={styles.retryButtonText}>{t("errors.retry")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showAddons) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopBar title={t("addons.title")} showBack={true} onBack={handleBackToPlans} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AddonsSection onAddonsChange={handleAddonsChange} />

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinueToSummary}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>{t("buttons.continueToSummary")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopBar title={t("pageTitle")} showBack={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CurrentPlanCard subscription={subscription} usage={usage} />

        {/* Standalone add-ons: extra invites / design templates for an active
            plan (ADD-03). Each is purchased with its own preflight + reconcile. */}
        {subscription ? (
          <TouchableOpacity
            style={styles.addonsEntry}
            onPress={() => navigation.navigate("AddonsPurchase")}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary[600]} />
            <Text style={styles.addonsEntryText}>{t("addons.manageEntry")}</Text>
            <DirectionalIonicon name="chevron-forward" size={16} color={colors.primary[400]} />
          </TouchableOpacity>
        ) : null}

        {/* Billing Type Toggle (event / monthly) */}
        <View style={styles.billingPills}>
          {["event", "monthly"].map((type) => {
            const active = billingType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.billingPill, active && styles.billingPillActive]}
                onPress={() => {
                  setBillingType(type);
                  setSelectedInvites(null);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.billingPillText,
                    active && styles.billingPillTextActive,
                  ]}
                >
                  {t(`billingTypes.${type}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plan cards */}
        {basicPlans.length === 0 && premiumPlans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t("errors.noPlansAvailable")}</Text>
          </View>
        ) : (
          <>
            <HostPlanCard
              planFamily="basic"
              plans={basicPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={setSelectedInvites}
              onSubscribe={(plan) => handleSubscribe("basic", plan)}
            />
            <HostPlanCard
              planFamily="premium"
              isPopular
              plans={premiumPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={setSelectedInvites}
              onSubscribe={(plan) => handleSubscribe("premium", plan)}
            />
          </>
        )}
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
  billingPills: {
    flexDirection: "row",
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius[12],
    padding: 4,
    marginBottom: spacing[16],
    gap: 4,
  },
  billingPill: {
    flex: 1,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    borderRadius: borderRadius[8],
    alignItems: "center",
  },
  billingPillActive: {
    backgroundColor: colors.primary[500],
  },
  billingPillText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[800],
  },
  billingPillTextActive: {
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
  addonsEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[12],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    marginBottom: spacing[16],
  },
  addonsEntryText: {
    flex: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[700],
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[8],
    padding: spacing[12],
    backgroundColor: colors.primary[100],
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: borderRadius[12],
    marginTop: spacing[16],
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[800],
    lineHeight: 20,
  },
  continueBtn: {
    paddingVertical: spacing[16],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    marginTop: spacing[24],
    marginBottom: spacing[20],
  },
  continueBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.large,
    color: colors.natural[50],
  },
});

export default PlansScreen;
