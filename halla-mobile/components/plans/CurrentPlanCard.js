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

const CurrentPlanCard = ({ subscription, usage }) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

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

  const planName = isArabic
    ? subscription.planNameAr || subscription.planName
    : subscription.planNameEn || subscription.planName;

  const eventsUsed = usage?.eventsUsed || 0;
  const eventsLimit =
    usage?.eventsLimit || subscription.limits?.maxEventsPerMonth || 0;
  const guestsUsed = usage?.guestsUsed || 0;
  const guestsLimit =
    usage?.guestsLimit ||
    subscription.limits?.maxInvitesPerEvent ||
    subscription.limits?.maxGuestsPerEvent ||
    0;
  const daysRemaining = subscription.daysRemaining || 0;

  const eventsPercent = eventsLimit > 0 ? (eventsUsed / eventsLimit) * 100 : 0;
  const guestsPercent = guestsLimit > 0 ? (guestsUsed / guestsLimit) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.header}>
        <Text style={styles.title}>{t("currentPlan.title")}</Text>
        {planName ? <Text style={styles.planName}>{planName}</Text> : null}
      </View>

      <View style={styles.usageGrid}>
        <UsageItem
          icon="calendar-outline"
          label={t("currentPlan.events")}
          used={eventsUsed}
          limit={eventsLimit}
          percent={eventsPercent}
          showProgress
        />
        <UsageItem
          icon="people-outline"
          label={t("currentPlan.invites")}
          used={guestsUsed}
          limit={guestsLimit}
          percent={guestsPercent}
          showProgress
        />
        <UsageItem
          icon="time-outline"
          label={t("currentPlan.daysRemaining")}
          singleValue={daysRemaining}
        />
      </View>
    </View>
  );
};

const UsageItem = ({ icon, label, used, limit, percent, singleValue, showProgress }) => {
  const isNearLimit = percent >= 80;
  const isAtLimit = percent >= 100;
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

  return (
    <View style={styles.usageItem}>
      <View style={styles.usageIcon}>
        <Ionicons name={icon} size={18} color={colors.primary[500]} />
      </View>
      <View style={styles.usageInfo}>
        <Text style={styles.usageLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.usageValue, { color: valueColor }]}>
          {singleValue !== undefined ? singleValue : `${used} / ${limit}`}
        </Text>
        {showProgress ? (
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
    marginBottom: spacing[16],
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
  usageGrid: {
    flexDirection: "row",
    gap: spacing[8],
  },
  usageItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[8],
    padding: spacing[12],
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  usageIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius[8],
    backgroundColor: colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  usageInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  usageLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.caption.large,
    color: colors.accent[500],
  },
  usageValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[700],
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius[4],
    overflow: "hidden",
    marginTop: spacing[8],
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
