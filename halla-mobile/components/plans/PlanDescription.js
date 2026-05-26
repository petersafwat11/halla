import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { formatNumber } from "../../utils/locale";

const COMPENSATION_PERCENTAGE = 15;

/**
 * <PlanDescription> — mobile mirror of the web component.
 * Source-of-truth contract is documented in docs/plans-rewrite-2026-05.md §5.
 *
 * Renders (in order):
 *   1. Family tagline (basic / premium / business)
 *   2. Duration line (event / monthly / quarterly / annual)
 *   3. "All Basic features +" heading (premium only)
 *   4. Feature bullets from plan.featureBullets[lang]
 *   5. Compensation row (computed from COMPENSATION_PERCENTAGE)
 *   6. Setup fee row (if plan.setupFeeAmount > 0)
 *   7. Free invites row (pool plans with invitePool > 0)
 *   8. WhatsApp templates row (if features.whatsAppTemplates > 0)
 */
const PlanDescription = ({
  plan,
  lang,
  selectedInviteCount,
  showTagline = true,
}) => {
  const { t, i18n } = useTranslation("plans");
  const activeLang = lang || i18n.language || "ar";

  if (!plan) return null;

  const bullets =
    (plan.featureBullets && plan.featureBullets[activeLang]) || [];
  const family = plan.planFamily;
  const billingType = plan.billingType;
  const setupFee = Number(plan.setupFeeAmount) || 0;
  const whatsappCount = Number(plan.features?.whatsAppTemplates) || 0;
  const isPool =
    billingType === "monthly" ||
    billingType === "quarterly" ||
    billingType === "annual";
  const invitePool = plan.invitePool ?? plan.limits?.invitePool ?? null;
  const perEventInvites =
    plan.invites ?? plan.limits?.maxInvitesPerEvent ?? 0;

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
    if (durationDays) return t("duration.event", { days: durationDays });
    return null;
  })();

  const tagline = family ? t(`taglines.${family}`, { defaultValue: "" }) : "";
  const includesBasic = family === "premium";

  return (
    <View style={styles.container}>
      {showTagline && tagline ? (
        <Text style={styles.tagline}>{tagline}</Text>
      ) : null}

      {durationLine ? (
        <Text style={styles.duration}>{durationLine}</Text>
      ) : null}

      {includesBasic ? (
        <Text style={styles.includesHeading}>{t("includes.basic")}</Text>
      ) : null}

      {bullets.length > 0 ? (
        <View style={styles.bullets}>
          {bullets.map((line, i) => (
            <View key={i} style={styles.bulletItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#2A8C5B"
              />
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.metaRows}>
        {compensationCount > 0 ? (
          <View style={styles.metaRow}>
            <Ionicons name="gift-outline" size={16} color="#C28E5C" />
            <Text style={styles.metaText}>
              {t("compensationRow", {
                count: formatNumber(compensationCount, activeLang),
                percent: COMPENSATION_PERCENTAGE,
                base: formatNumber(compensationBase, activeLang),
              })}
            </Text>
          </View>
        ) : null}

        {setupFee > 0 ? (
          <View style={styles.metaRow}>
            <Ionicons name="briefcase-outline" size={16} color="#C28E5C" />
            <Text style={styles.metaText}>
              {t("setupFeeRow", {
                amount: formatNumber(setupFee, activeLang),
              })}
            </Text>
          </View>
        ) : null}

        {isPool && invitePool > 0 ? (
          <View style={styles.metaRow}>
            <Ionicons name="mail-outline" size={16} color="#C28E5C" />
            <Text style={styles.metaText}>
              {t("freeInvitesRow", {
                count: formatNumber(invitePool, activeLang),
              })}
            </Text>
          </View>
        ) : null}

        {whatsappCount > 0 ? (
          <View style={styles.metaRow}>
            <Ionicons name="logo-whatsapp" size={16} color="#2A8C5B" />
            <Text style={styles.metaText}>
              {t("whatsappTemplates", { count: whatsappCount })}
            </Text>
          </View>
        ) : null}
      </View>
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
    color: "#7c3aed",
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
    color: "#7c3aed",
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
