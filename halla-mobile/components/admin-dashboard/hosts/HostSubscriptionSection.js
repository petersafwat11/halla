import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "../common/StatusBadge";
import { SectionCard, InfoRow } from "./HostSectionCard";
import { colors, spacing, borderRadius, typography, backgrounds } from "../../../styles/tokens";

const getPlanStyle = (planType) => {
  if (!planType) return { color: colors.natural[500], bg: colors.natural[150] };
  const t = planType.toLowerCase();
  if (t.includes("elite")) return { color: colors.error[500], bg: colors.error[50] };
  if (t.includes("pro"))   return { color: colors.warning[500], bg: colors.warning[50] };
  if (t.includes("lite"))  return { color: "#9B59B6", bg: "#F5EEF8" };
  if (t.includes("single")) return { color: "#3498DB", bg: "#E8F4FD" };
  if (t.includes("trial")) return { color: colors.natural[400], bg: colors.natural[150] };
  return { color: colors.primary[500], bg: colors.primary[50] };
};

const HostSubscriptionSection = ({ subscription, formatDate }) => {
  if (!subscription) {
    return (
      <SectionCard title="Subscription" icon="card-outline">
        <View style={styles.empty}>
          <Ionicons name="card-outline" size={28} color={colors.natural[300]} />
          <Text style={styles.emptyText}>No active subscription</Text>
        </View>
      </SectionCard>
    );
  }

  const planStyle = getPlanStyle(subscription.planType);
  const planName =
    subscription?.planId?.nameEn ||
    subscription?.planId?.name ||
    subscription?.planType ||
    "No Plan";
  const hasLimits = !!subscription?.planId?.limits;

  return (
    <SectionCard title="Subscription" icon="card-outline">
      <InfoRow
        icon="gift-outline"
        label="Plan"
        badge={
          <View style={[styles.planChip, { backgroundColor: planStyle.bg }]}>
            <Text style={[styles.planChipText, { color: planStyle.color }]}>{planName}</Text>
          </View>
        }
      />
      <InfoRow
        icon="checkmark-circle-outline"
        label="Status"
        badge={<StatusBadge status={subscription.status} size="small" />}
      />
      {subscription.billingCycle && (
        <InfoRow icon="repeat-outline" label="Billing" value={subscription.billingCycle} />
      )}
      <InfoRow
        icon="calendar-outline"
        label="Expires"
        value={formatDate(subscription.endDate || subscription.currentPeriodEnd)}
        last={!hasLimits}
      />
      {hasLimits && (
        <View style={styles.limits}>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>Max Invites</Text>
            <Text style={styles.limitValue}>
              {subscription.planId.limits.invitePool ??
                subscription.planId.limits.maxInvitesPerEvent ??
                "∞"}
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Text style={styles.limitLabel}>Max Events</Text>
            <Text style={styles.limitValue}>
              {subscription.planId.limits.maxEvents === -1
                ? "∞"
                : subscription.planId.limits.maxEvents ?? "∞"}
            </Text>
          </View>
        </View>
      )}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[20],
  },
  emptyText: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[400],
  },
  planChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: borderRadius[20],
  },
  planChipText: { fontSize: 11, fontWeight: typography.fontWeight.semibold },
  limits: {
    flexDirection: "row",
    gap: spacing[8],
    padding: spacing[12],
  },
  limitItem: {
    flex: 1,
    backgroundColor: `${colors.primary[500]}08`,
    borderRadius: borderRadius[8],
    padding: spacing[12],
    alignItems: "center",
  },
  limitLabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    marginBottom: spacing[4],
  },
  limitValue: {
    fontSize: typography.fontSize.title.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },
});

export default HostSubscriptionSection;
