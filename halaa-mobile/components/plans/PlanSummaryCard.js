import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../commen/LocalizedText";
import AdaptiveText from "../commen/AdaptiveText";
import {
  COMPENSATION_PERCENTAGE,
  isPoolPlan,
  isRecurringBilling,
  getBillingType,
} from "@halaa/shared/constants/plans";
import { getLocalized } from "@halaa/shared/utils/locale";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { countToken, priceToken } from "@halaa/shared/utils/displayTokens";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

/**
 * Checkout plan summary.
 *
 * Content contract (blueprint §5/§6):
 *  - plan name: backend bilingual/mixed value → AdaptiveText (first strong);
 *  - prices/counts: atomic formatted tokens (priceToken/countToken), never
 *    JSX-concatenated sentences;
 *  - labels, subtitles and hints: localized copy that always follows the UI
 *    locale, regardless of the values around them.
 */
const PlanSummaryCard = ({
  selectedPlan,
  billingType,
  locale,
  planPrice,
  // When set (native IAP), the store's localized price string is shown and the
  // backend SAR amount + currency label are suppressed (P0-13 / §5.4).
  priceDisplay = null,
  isNative = false,
  addonItems = [],
  t,
}) => {
  const planType = selectedPlan?.planType;
  const effectiveBillingType =
    selectedPlan?.billingType ||
    getBillingType(planType) ||
    billingType ||
    "event";
  const isPool =
    isPoolPlan(planType) ||
    isRecurringBilling(effectiveBillingType) ||
    selectedPlan?.isPoolSubscription === true;

  const planName = getLocalized(selectedPlan, "name", locale) || t("summary.planDetails");

  const planSubtitle = isPool
    ? t("summary.unlimitedEvents")
    : t("summary.singleEvent");

  // Base invites: per-event plans now also expose `invitePool`, so prefer
  // it everywhere (falling back to legacy fields) — keeps the "base" used by
  // the invites row, compensation and total perfectly consistent.
  const baseInvites = isPool
    ? selectedPlan?.invitePool || 0
    : selectedPlan?.invitePool ??
      selectedPlan?.invites ??
      selectedPlan?.limits?.maxInvitesPerEvent ??
      0;

  // Feature rows are full translation keys with pre-formatted isolated count
  // tokens interpolated — no manual label + number concatenation.
  const inviteLabel = isPool
    ? t("summary.poolInvitesRow", {
        count: countToken(baseInvites, locale),
      })
    : t("summary.baseInvitesRow", {
        count: countToken(baseInvites, locale),
      });

  const eventLabel = isPool
    ? t("summary.unlimitedEvents")
    : t("summary.oneEvent");

  // Compensation is 15% of BASE invites only — purchased extras never earn
  // compensation. Per-event plans expose `compensationPool` too now.
  const compensationCount =
    selectedPlan?.compensationPool ??
    Math.floor(baseInvites * (COMPENSATION_PERCENTAGE / 100));

  // Extras = sum of every selected `extra_invites` line-item quantity.
  const extraInvites = addonItems
    .filter((item) => (item.addonType || item.type) === "extra_invites")
    .reduce((acc, item) => acc + (item.quantity || 0), 0);

  // Total pool the host actually gets = base + extras + compensation.
  const totalInvites = baseInvites + extraInvites + compensationCount;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <LocalizedText style={styles.cardTitle}>
          {t("summary.planDetails")}
        </LocalizedText>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.planInfo}>
          <View style={styles.planIcon}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primary[600]}
            />
          </View>
          <View style={styles.planDetails}>
            <AdaptiveText style={styles.planName} numberOfLines={2}>
              {planName}
            </AdaptiveText>
            <LocalizedText style={styles.planType}>
              {planSubtitle}
            </LocalizedText>
          </View>
          <View style={styles.planPrice}>
            {priceDisplay ? (
              // Native store price string — trusted, isolated verbatim.
              <LocalizedText style={styles.priceAmount}>
                {isolateLtr(priceDisplay)}
              </LocalizedText>
            ) : isNative ? (
              <LocalizedText style={styles.priceUnavailable}>
                {t("summary.priceUnavailable")}
              </LocalizedText>
            ) : (
              // Web/Moyasar: ONE atomic price token (amount + currency).
              <LocalizedText style={styles.priceAmount}>
                {priceToken(planPrice, t("summary.currency"))}
              </LocalizedText>
            )}
          </View>
        </View>

        <View style={styles.featuresSummary}>
          <FeatureRow
            iconName="people-outline"
            text={inviteLabel}
          />
          {extraInvites > 0 ? (
            <FeatureRow
              iconName="add-circle-outline"
              text={t("summary.extraInvitesRow", {
                count: countToken(extraInvites, locale),
              })}
            />
          ) : null}
          <FeatureRow
            iconName="calendar-outline"
            text={eventLabel}
          />
          <FeatureRow
            iconName="gift-outline"
            text={t("summary.compensationInvitesRow", {
              count: countToken(compensationCount, locale),
            })}
          />
        </View>

        {/* Unified total: base + purchased extras + 15% compensation */}
        <View style={styles.totalRow}>
          <View style={styles.totalRowHead}>
            <Ionicons
              name="people"
              size={18}
              color={colors.primary[700]}
            />
            <LocalizedText style={styles.totalLabel}>
              {t("summary.totalInvites")}
            </LocalizedText>
          </View>
          <LocalizedText style={styles.totalValue}>
            {countToken(totalInvites, locale)}
          </LocalizedText>
        </View>
        <LocalizedText style={styles.totalHint}>
          {t("summary.totalInvitesHint")}
        </LocalizedText>
        <LocalizedText style={styles.totalHint}>
          {t("summary.compensationHint")}
        </LocalizedText>
        <LocalizedText style={styles.totalHint}>
          {isPool
            ? t("summary.poolPlanHint")
            : t("summary.perEventPlanHint")}
        </LocalizedText>
      </View>
    </View>
  );
};

const FeatureRow = ({ iconName, text }) => (
  <View style={styles.featureItem}>
    <Ionicons name={iconName} size={16} color={colors.primary[600]} />
    <LocalizedText style={styles.featureText}>{text}</LocalizedText>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    marginBottom: spacing[12],
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
    backgroundColor: colors.natural[50],
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.medium,
    color: colors.secondary[900],
  },
  cardContent: {
    padding: spacing[16],
    gap: spacing[16],
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    padding: spacing[12],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius[12],
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    justifyContent: "center",
    alignItems: "center",
  },
  planDetails: {
    flex: 1,
    minWidth: 0,
  },
  planName: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    lineHeight: 20,
    color: colors.secondary[900],
    marginBottom: 2,
  },
  planType: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.medium,
    lineHeight: 18,
    color: colors.natural[450],
  },
  planPrice: {
    alignItems: "flex-end",
  },
  priceAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
    color: colors.primary[700],
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  priceCurrency: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.small,
    color: colors.primary[600],
  },
  priceUnavailable: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    color: colors.natural[450],
    lineHeight: 22,
  },
  featuresSummary: {
    gap: spacing[8],
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: colors.natural[150],
    borderRadius: borderRadius[8],
  },
  featureText: {
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
    flex: 1,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  totalRowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    flexShrink: 1,
  },
  totalLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.medium,
    color: colors.primary[800],
    flexShrink: 1,
  },
  totalValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    color: colors.primary[700],
    letterSpacing: -0.3,
  },
  totalHint: {
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    lineHeight: 16,
  },
});

export default PlanSummaryCard;
