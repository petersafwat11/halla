import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";
import {
  formatNumber,
  formatPercent,
} from "@halaa/shared/utils/locale";
import { countToken } from "@halaa/shared/utils/displayTokens";
import { isolateRtl, isolateLtr } from "@halaa/shared/utils/bidi";
import {
  COMPENSATION_PERCENTAGE,
  isPoolPlan,
  isRecurringBilling,
  getPlanFamily,
  getBillingType,
} from "@halaa/shared/constants/plans";
import { colors } from "../../styles/tokens";

/**
 * <PlanDescription> — mobile mirror of the web component.
 *
 * Props mirror web/ui/plans/PlanDescription:
 *   showTagline  — render the family tagline above bullets (default true)
 *   showDuration — render the duration line above bullets (default true).
 *                  Has no effect when `inlineExtras` is true.
 *   inlineExtras — when true, fold duration + compensation into the bullet
 *                  list (with checkmark icons) instead of rendering them as
 *                  standalone rows. Matches the landing pricing card.
 *
 * Text contract: every visible line is app-authored copy that follows the UI
 * locale (LocalizedText); interpolated numbers/percentages are formatted and
 * BiDi-isolated tokens so parentheses/digits never reorder (blueprint §6).
 */
const PlanDescription = ({
  plan,
  lang,
  selectedInviteCount,
  showTagline = true,
  showDuration = true,
  inlineExtras = false,
}) => {
  const { t, i18n } = useTranslation("plans");
  const activeLang = lang || i18n.language || "ar";

  if (!plan) return null;

  const localizedBullets =
    plan.featureBullets && plan.featureBullets[activeLang];
  const bullets = Array.isArray(localizedBullets) ? localizedBullets : [];
  const family = plan.planFamily || getPlanFamily(plan.planType);
  const billingType = plan.billingType || getBillingType(plan.planType);
  const setupFee = Number(plan.setupFeeAmount) || 0;
  const whatsappCount = Number(plan.features?.whatsAppTemplates) || 0;
  const isPool = isPoolPlan(plan.planType) || isRecurringBilling(billingType);
  const invitePool = plan.invitePool ?? plan.limits?.invitePool ?? null;
  const perEventInvites =
    plan.invitePool ??
    plan.limits?.invitePool ??
    plan.invites ??
    plan.limits?.maxInvitesPerEvent ??
    0;

  const compensationBase = isPool
    ? invitePool || 0
    : selectedInviteCount ?? perEventInvites;
  const compensationCount =
    compensationBase > 0
      ? Math.floor((compensationBase * COMPENSATION_PERCENTAGE) / 100)
      : 0;
  const durationDays = plan.limits?.durationDays;
  const durationLine = (() => {
    if (billingType === "monthly") return t("duration.monthly");
    if (billingType === "quarterly") return t("duration.quarterly");
    if (billingType === "annual") return t("duration.annual");
    if (durationDays)
      return t("duration.event", { days: countToken(durationDays, activeLang) });
    return null;
  })();

  const tagline = family ? t(`taglines.${family}`, { defaultValue: "" }) : "";
  const includesBasic = family === "premium";

  // Compensation math copy: the percent/base are isolated per direction so
  // parentheses and digits never BiDi-reorder (plan §5C). Arabic percent is
  // an RTL token; Latin percent stays LTR.
  const isolate = (value) =>
    activeLang === "ar" ? isolateRtl(value) : isolateLtr(value);
  const compensationLine =
    compensationCount > 0
      ? t("compensationRow", {
          count: countToken(compensationCount, activeLang),
          percent: isolate(formatPercent(COMPENSATION_PERCENTAGE, activeLang)),
          base: isolate(formatNumber(compensationBase, activeLang)),
        })
      : null;

  const mergedBullets = inlineExtras
    ? [
        ...(durationLine ? [durationLine] : []),
        ...bullets,
        ...(compensationLine ? [compensationLine] : []),
      ]
    : bullets;

  return (
    <View style={styles.container}>
      {showTagline && tagline ? (
        <LocalizedText style={styles.tagline}>{tagline}</LocalizedText>
      ) : null}

      {showDuration && !inlineExtras && durationLine ? (
        <LocalizedText style={styles.duration}>{durationLine}</LocalizedText>
      ) : null}

      {includesBasic ? (
        <LocalizedText style={styles.includesHeading}>
          {t("includes.basic")}
        </LocalizedText>
      ) : null}

      {mergedBullets.length > 0 ? (
        <View style={styles.bullets}>
          {mergedBullets.map((line, i) => (
            <View key={i} style={styles.bulletItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#2A8C5B"
              />
              <LocalizedText style={styles.bulletText}>{line}</LocalizedText>
            </View>
          ))}
        </View>
      ) : null}

      {!inlineExtras && (compensationCount > 0 || setupFee > 0 || (isPool && invitePool > 0) || whatsappCount > 0) ? (
        <View style={styles.metaRows}>
          {compensationCount > 0 ? (
            <View style={styles.metaRow}>
              <Ionicons name="gift-outline" size={16} color="#C28E5C" />
              <LocalizedText style={styles.metaText}>
                {compensationLine}
              </LocalizedText>
            </View>
          ) : null}

          {setupFee > 0 ? (
            <View style={styles.metaRow}>
              <Ionicons name="briefcase-outline" size={16} color="#C28E5C" />
              <LocalizedText style={styles.metaText}>
                {t("setupFeeRow", {
                  amount: countToken(setupFee, activeLang),
                })}
              </LocalizedText>
            </View>
          ) : null}

          {isPool && invitePool > 0 ? (
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={16} color="#C28E5C" />
              <LocalizedText style={styles.metaText}>
                {t("freeInvitesRow", {
                  count: countToken(invitePool, activeLang),
                })}
              </LocalizedText>
            </View>
          ) : null}

          {whatsappCount > 0 ? (
            <View style={styles.metaRow}>
              <Ionicons name="logo-whatsapp" size={16} color="#2A8C5B" />
              <LocalizedText style={styles.metaText}>
                {t("whatsappTemplates", {
                  count: countToken(whatsappCount, activeLang),
                })}
              </LocalizedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingVertical: 6,
  },
  tagline: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: colors.primary[600],
    lineHeight: 20,
  },
  duration: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#6B4E33",
  },
  includesHeading: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    color: colors.primary[600],
  },
  bullets: {
    gap: 6,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#2C2C2C",
    lineHeight: 18,
  },
  metaRows: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5DDD2",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#3F2E1F",
    lineHeight: 18,
  },
});

export default PlanDescription;
