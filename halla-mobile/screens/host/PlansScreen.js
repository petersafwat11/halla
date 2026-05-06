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
import { useNavigation } from "@react-navigation/native";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";

import TopBar from "../../components/plans/TopBar";
import CurrentPlanCard from "../../components/plans/CurrentPlanCard";
import HostPlanCard from "../../components/plans/HostPlanCard";
import AddonsSection from "../../components/plans/AddonsSection";
import { useHostPlans, useSubscription } from "../../hooks";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";

const getInviteValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool;
  return plan.invites || plan.limits?.maxInvitesPerEvent;
};

const PlansScreen = () => {
  const { t } = useTranslation("plans");
  const navigation = useNavigation();
  const toast = useToast();

  const [billingType, setBillingType] = useState("event");
  const [selectedInvites, setSelectedInvites] = useState(null);

  const { data: response, isLoading: loading, error } = useHostPlans();
  const { data: subscriptionData } = useSubscription();
  const subscription = subscriptionData?.data?.subscription || null;
  const usage = subscription?.usage || null;

  const basicPlans = useMemo(
    () => response?.data?.basic?.[billingType] || [],
    [response, billingType]
  );
  const premiumPlans = useMemo(
    () => response?.data?.premium?.[billingType] || [],
    [response, billingType]
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

  useEffect(() => {
    if (error) {
      toast.error(t("errors.loadFailed"));
    }
  }, [error]);

  const compensationInvites = useMemo(() => {
    if (!selectedInvites) return 0;
    return Math.floor(selectedInvites * 0.15);
  }, [selectedInvites]);

  const handleSubscribe = (planFamily, plan) => {
    if (!plan) {
      toast.error(t("errors.selectPlan"));
      return;
    }

    navigation.navigate("PlansSummary", {
      selectedPlan: {
        ...plan,
        price: plan?.pricing?.oneTime || plan?.price,
        planFamily,
        billingType,
      },
    });
  };

  if (loading) {
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopBar title={t("pageTitle")} showBack={true} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CurrentPlanCard subscription={subscription} usage={usage} />

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
              compensationCount={compensationInvites}
              onSubscribe={(plan) => handleSubscribe("basic", plan)}
            />
            <HostPlanCard
              planFamily="premium"
              isPopular
              plans={premiumPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={setSelectedInvites}
              compensationCount={compensationInvites}
              onSubscribe={(plan) => handleSubscribe("premium", plan)}
            />
          </>
        )}

        <AddonsSection />

        <View style={styles.infoNote}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>{t("infoNote")}</Text>
        </View>
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
});

export default PlansScreen;
