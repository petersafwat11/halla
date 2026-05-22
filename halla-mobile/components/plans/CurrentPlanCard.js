import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";
import { getLocalized } from "../../utils/locale";
import { isPoolPlan } from "../../utils/constants/plans";

const CurrentPlanCard = ({ subscription, usage }) => {
  const { t, i18n } = useTranslation("plans");

  if (!subscription) {
    return (
      <View style={styles.noSubCard}>
        <View style={styles.accent} />
        <View style={styles.noSubIcon}>
          <Ionicons
            name="calendar-outline"
            size={22}
            color={colors.primary[500]}
          />
        </View>
        <View style={styles.noSubTextWrap}>
          <Text style={styles.noSubTitle}>
            {t("noActiveSubscription.title")}
          </Text>
          <Text style={styles.noSubSubtitle}>
            {t("noActiveSubscription.subtitle")}
          </Text>
        </View>
      </View>
    );
  }

  const planName = getLocalized(subscription, "planName", i18n.language);

  // Pool plans (basic_monthly, premium_monthly, business_*) report `maxEvents: -1`
  // (unlimited events) and `maxInvitesPerEvent: null`; capacity is tracked on the
  // subscription itself via `invitePool` / `invitesConsumed`. Per-event plans use
  // `usage.guestsUsed` against the plan's `maxInvitesPerEvent`.
  const planType = subscription.planType;
  const isPool =
    subscription.isPoolSubscription === true || isPoolPlan(planType);

  const eventsUsed = usage?.eventsCreated || 0;
  const eventsLimit = subscription.limits?.maxEvents ?? 0;
  const eventsUnlimited = eventsLimit === -1;

  const guestsUsed = isPool
    ? (subscription.invitesConsumed ?? 0)
    : (usage?.guestsUsed ?? 0);
  const guestsLimit = isPool
    ? (subscription.invitePool ?? 0)
    : (subscription.limits?.maxInvitesPerEvent ?? 0);

  const daysRemaining = subscription.daysRemaining || 0;

  const eventsPercent = eventsUnlimited
    ? 0
    : eventsLimit > 0
      ? (eventsUsed / eventsLimit) * 100
      : 0;
  const guestsPercent = guestsLimit > 0 ? (guestsUsed / guestsLimit) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.header}>
        <Text style={styles.title}>{t("currentPlan.title")}</Text>
        {planName ? <Text style={styles.planName}>{planName}</Text> : null}
      </View>

      <View style={styles.statsContainer}>
        <StatItem
          icon="calendar-outline"
          label={t("currentPlan.events")}
          used={eventsUsed}
          limit={eventsLimit}
          percent={eventsPercent}
          isUnlimited={eventsUnlimited}
          showProgress
        />
        <StatItem
          icon="people-outline"
          label={t("currentPlan.invites")}
          used={guestsUsed}
          limit={guestsLimit}
          percent={guestsPercent}
          showProgress
        />
        <StatItem
          icon="time-outline"
          label={t("currentPlan.daysRemaining")}
          singleValue={daysRemaining}
        />
      </View>
    </View>
  );
};

const StatItem = ({ icon, label, used, limit, percent, singleValue, showProgress, isUnlimited = false }) => {
  const isNearLimit = !isUnlimited && percent >= 80;
  const isAtLimit = !isUnlimited && percent >= 100;
  const valueColor = isAtLimit
    ? colors.error[500]
    : isNearLimit
      ? colors.warning[500]
      : colors.secondary[700];
  const fillColor = isAtLimit
    ? colors.error[500]
    : isNearLimit
      ? colors.warning[500]
      : colors.primary[500];

  const valueText = singleValue !== undefined
    ? singleValue
    : isUnlimited
      ? `${used} / ∞`
      : `${used} / ${limit}`;

  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={colors.primary[500]} />
      </View>
      <View style={styles.statContent}>
        <View style={styles.statInfo}>
          <Text style={styles.statLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.statValue, { color: valueColor }]}>
            {valueText}
          </Text>
        </View>
        {showProgress && !isUnlimited ? (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(percent, 100)}%`,
                  backgroundColor: fillColor,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Active subscription card
  card: {
    position: "relative",
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius[20],
    borderWidth: 1,
    borderColor: colors.primary[200],
    padding: spacing[16],
    marginBottom: spacing[16],
    overflow: "hidden",
    shadowColor: colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary[500],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[12],
    paddingBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[700],
  },
  planName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
    overflow: "hidden",
  },
  statsContainer: {
    gap: spacing[2],
  },
  statRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
    paddingVertical: spacing[8],
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius[8],
    backgroundColor: colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  statContent: {
    flex: 1,
    gap: spacing[6],
  },
  statInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  statLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.accent[500],
    flexShrink: 1,
    marginRight: spacing[8],
  },
  statValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[700],
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius[4],
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius[4],
  },

  // No active subscription card (compact)
  noSubCard: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.primary[200],
    padding: spacing[16],
    marginBottom: spacing[16],
    overflow: "hidden",
    shadowColor: colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  noSubIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  noSubTextWrap: {
    flex: 1,
    gap: 2,
  },
  noSubTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[700],
  },
  noSubSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.body.small,
    color: colors.accent[500],
  },
});

export default CurrentPlanCard;
