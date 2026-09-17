import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import DirectionalIonicon from "../common/DirectionalIonicon";
import LocalizedText from "../commen/LocalizedText";
import AdaptiveText from "../commen/AdaptiveText";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";
import { getLocalized } from "@halaa/shared/utils/locale";
import { countRatioToken, countToken } from "@halaa/shared/utils/displayTokens";
import {
  getInviteBreakdown,
  isTrialSubscription,
} from "@halaa/shared/utils/invitationBalance";

// One icon per breakdown row key, so the row reads at a glance.
const BREAKDOWN_ICONS = {
  planInvites: "layers-outline",
  extraInvites: "paper-plane-outline",
  compensationInvites: "gift-outline",
  carriedInvites: "swap-horizontal-outline",
};

const CurrentPlanCard = ({ subscription, usage, onBuyAddons, style }) => {
  const { t, i18n } = useTranslation("plans");
  const lang = i18n.language || "ar";

  if (!subscription) {
    return <NoActivePlanCard style={style} />;
  }

  // The free trial is not a real plan: it must never render as a purchased
  // subscription ("1 event / 5 invites"). Trial accounts see the same
  // "no active plan" state as unsubscribed users so they are steered to buy —
  // which also keeps the add-ons entry point off the trial.
  if (isTrialSubscription(subscription)) {
    return <NoActivePlanCard style={style} />;
  }

  const planName = getLocalized(subscription, "planName", i18n.language);

  const invitationBalance = subscription.invitationBalance;

  const eventsUsed = usage?.eventsCreated || 0;
  const eventsLimit = subscription.limits?.maxEvents ?? 0;
  const eventsUnlimited = eventsLimit === -1;

  const guestsUsed = invitationBalance?.consumed ?? 0;
  const guestsLimit = invitationBalance?.total ?? 0;
  const guestsUnlimited = invitationBalance?.unlimited === true;

  const daysRemaining =
    subscription.daysRemaining === -1 || subscription.daysRemaining == null
      ? t("currentPlan.noExpiry")
      : Math.max(0, subscription.daysRemaining);

  const eventsPercentRaw = eventsUnlimited
    ? 0
    : eventsLimit > 0
      ? (eventsUsed / eventsLimit) * 100
      : 0;
  const guestsPercentRaw = guestsUnlimited || guestsLimit <= 0
    ? 0
    : (guestsUsed / guestsLimit) * 100;
  const eventsPercent = Number.isFinite(eventsPercentRaw) ? eventsPercentRaw : 0;
  const guestsPercent = Number.isFinite(guestsPercentRaw) ? guestsPercentRaw : 0;

  // Where the invites came from: plan / purchased extras / 15% compensation /
  // business carryover. Empty for unlimited plans.
  const breakdown = getInviteBreakdown(invitationBalance);
  // The note only explains the 15% row, so it is silent when there is none.
  const hasCompensation = breakdown.some((row) => row.key === "compensationInvites");

  return (
    <View style={[styles.card, style]}>
      <View style={styles.accent} />
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <LocalizedText style={styles.title}>
            {t("currentPlan.title")}
          </LocalizedText>
          {planName ? (
            // Backend bilingual/mixed value → follows its own script.
            <AdaptiveText style={styles.planName} numberOfLines={1}>
              {planName}
            </AdaptiveText>
          ) : null}
        </View>
        {onBuyAddons ? (
          <TouchableOpacity
            style={styles.buyAddonsBtn}
            onPress={onBuyAddons}
            activeOpacity={0.7}
          >
            <Ionicons
              name="add-circle-outline"
              size={16}
              color={colors.primary[600]}
            />
            <LocalizedText style={styles.buyAddonsBtnText}>
              {t("addons.manageEntry")}
            </LocalizedText>
            <DirectionalIonicon
              name="chevron-forward"
              size={14}
              color={colors.primary[400]}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {breakdown.length > 0 ? (
        <View style={styles.breakdown}>
          <LocalizedText style={styles.breakdownTitle}>
            {t("currentPlan.inviteBreakdown")}
          </LocalizedText>
          {breakdown.map(({ key, value }) => (
            <View style={styles.breakdownRow} key={key}>
              <View style={styles.breakdownIcon}>
                <Ionicons
                  name={BREAKDOWN_ICONS[key]}
                  size={14}
                  color={colors.primary[500]}
                />
              </View>
              <LocalizedText style={styles.breakdownLabel} numberOfLines={1}>
                {t(`currentPlan.${key}`)}
              </LocalizedText>
              <LocalizedText style={styles.breakdownValue}>
                {countToken(value, lang)}
              </LocalizedText>
            </View>
          ))}
          {hasCompensation ? (
            <LocalizedText style={styles.breakdownNote}>
              {t("currentPlan.compensationNote")}
            </LocalizedText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.statsContainer}>
        <StatItem
          lang={lang}
          icon="calendar-outline"
          label={t("currentPlan.events")}
          used={eventsUsed}
          limit={eventsLimit}
          percent={eventsPercent}
          isUnlimited={eventsUnlimited}
          showProgress
        />
        <StatItem
          lang={lang}
          icon="people-outline"
          label={t("currentPlan.invites")}
          used={guestsUsed}
          limit={guestsLimit}
          percent={guestsPercent}
          isUnlimited={guestsUnlimited}
          showProgress
        />
        <StatItem
          lang={lang}
          icon="time-outline"
          label={t("currentPlan.daysRemaining")}
          singleValue={daysRemaining}
        />
      </View>
    </View>
  );
};

// "No active plan" compact card. Also shown to trial accounts — the trial
// is not a purchasable plan, so it must not render like one.
const NoActivePlanCard = ({ style }) => {
  const { t } = useTranslation("plans");
  return (
    <View style={[styles.noSubCard, style]}>
      <View style={styles.accent} />
      <View style={styles.noSubIcon}>
        <Ionicons
          name="calendar-outline"
          size={22}
          color={colors.primary[500]}
        />
      </View>
      <View style={styles.noSubTextWrap}>
        <LocalizedText style={styles.noSubTitle}>
          {t("noActiveSubscription.title")}
        </LocalizedText>
        <LocalizedText style={styles.noSubSubtitle}>
          {t("noActiveSubscription.subtitle")}
        </LocalizedText>
      </View>
    </View>
  );
};

const StatItem = ({
  lang,
  icon,
  label,
  used,
  limit,
  percent,
  singleValue,
  showProgress,
  isUnlimited = false,
}) => {
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

  // Counts are ONE locale-formatted, BiDi-isolated token so the slash and
  // digits can never mix digit policies or reorder (blueprint §6).
  const valueText =
    singleValue !== undefined
      ? typeof singleValue === "number"
        ? countToken(singleValue, lang)
        : singleValue // localized copy such as "لا تنتهي" / "No expiry"
      : isUnlimited
        ? countRatioToken(used, null, lang)
        : countRatioToken(used, limit, lang);

  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={colors.primary[500]} />
      </View>
      <View style={styles.statContent}>
        <View style={styles.statInfo}>
          <LocalizedText style={styles.statLabel} numberOfLines={1}>
            {label}
          </LocalizedText>
          <LocalizedText style={[styles.statValue, { color: valueColor }]}>
            {valueText}
          </LocalizedText>
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
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    flexShrink: 1,
  },
  buyAddonsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius[12],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
  },
  buyAddonsBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.caption.medium,
    color: colors.primary[700],
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
  // Invite provenance block
  breakdown: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.primary[100],
    padding: spacing[12],
    marginBottom: spacing[12],
    gap: spacing[8],
  },
  breakdownTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
    marginBottom: spacing[4],
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  breakdownIcon: {
    width: 24,
    height: 24,
    borderRadius: borderRadius[8],
    backgroundColor: colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  breakdownLabel: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.accent[500],
  },
  breakdownValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.secondary[700],
  },
  breakdownNote: {
    marginTop: spacing[4],
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.caption.medium,
    lineHeight: 18,
    color: colors.natural[400],
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
    gap: spacing[8],
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
    marginEnd: spacing[8],
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
    // Fill grows from the logical start edge in both directions.
    alignItems: "flex-start",
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
