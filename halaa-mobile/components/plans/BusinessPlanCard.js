import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import { getLocalized, formatNumber } from "@halla/shared/utils/locale";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../styles/tokens";
import SarIcon from "../commen/SarIcon";
import PlanDescription from "./PlanDescription";

/**
 * <BusinessPlanCard> — mobile business-plan card (B4-MOBILE).
 *
 * Mirrors <HostPlanCard> but for business accounts: business plans are
 * single-plan-per-billing-tier (no invite slider), carry a one-time setup fee,
 * and the action is gated on whether the business may self-purchase.
 *
 * Action gating:
 *   - `canSelfUpgrade` (active subscription) → renders an "upgrade" CTA that
 *     hands the plan up to the parent (which routes through the shared
 *     PlansSummary checkout flow, same as host self-purchase).
 *   - otherwise (no active subscription) → no self-purchase. The button is
 *     replaced by a muted "contact admin / pending activation" note, matching
 *     the server-side gate (admins assign business plans; no self-checkout
 *     until active).
 *   - `isCurrent` marks the currently-assigned / active plan with a badge and
 *     suppresses its own upgrade CTA.
 */
const BusinessPlanCard = ({
  plan,
  isCurrent = false,
  canSelfUpgrade = false,
  onUpgrade,
}) => {
  const { t, i18n } = useTranslation("plans");
  const lang = i18n.language || "ar";

  if (!plan) return null;

  const name = getLocalized(plan, "name", lang);
  const price = plan.price || plan.pricing?.oneTime || 0;
  const setupFee = Number(plan.setupFeeAmount) || 0;

  return (
    <View style={[styles.card, isCurrent && styles.cardCurrent]}>
      {isCurrent ? (
        <View style={styles.currentBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.natural[50]} />
          <Text style={styles.currentBadgeText}>{t("business.currentBadge")}</Text>
        </View>
      ) : null}

      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceNum}>{(price || 0).toLocaleString()}</Text>
          <SarIcon size={20} color={colors.secondary[700]} />
        </View>
      </View>

      {setupFee > 0 ? (
        <View style={styles.setupFeeRow}>
          <Ionicons name="construct-outline" size={14} color={colors.primary[500]} />
          <Text style={styles.setupFeeText}>
            {t("setupFeeRow", { amount: formatNumber(setupFee, lang) })}
          </Text>
        </View>
      ) : null}

      <PlanDescription
        plan={plan}
        lang={lang}
        showTagline={false}
        showDuration
        inlineExtras
      />

      {isCurrent ? null : canSelfUpgrade ? (
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => onUpgrade?.(plan)}
          activeOpacity={0.8}
        >
          <Text style={styles.upgradeBtnText}>{t("business.upgradeAction")}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.lockedNote}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.accent[500]} />
          <Text style={styles.lockedNoteText}>{t("business.contactAdminShort")}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: "relative",
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[20],
    padding: spacing[20],
    marginBottom: spacing[16],
    shadowColor: colors.black[100],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardCurrent: {
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    shadowColor: colors.primary[500],
    shadowOpacity: 0.18,
  },
  currentBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: 999,
  },
  currentBadgeText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.small,
    color: colors.natural[50],
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[12],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    marginBottom: spacing[16],
  },
  name: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.large,
    color: colors.secondary[700],
    flex: 1,
    minWidth: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: 26,
    color: colors.secondary[700],
    lineHeight: 28,
  },
  setupFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    marginBottom: spacing[12],
  },
  setupFeeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.primary[800],
    flex: 1,
  },
  upgradeBtn: {
    paddingVertical: spacing[16],
    borderRadius: borderRadius[12],
    backgroundColor: colors.primary[500],
    alignItems: "center",
    marginTop: spacing[8],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  upgradeBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.body.large,
    color: colors.natural[50],
  },
  lockedNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius[12],
    marginTop: spacing[8],
  },
  lockedNoteText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.accent[500],
    textAlign: "center",
  },
});

export default BusinessPlanCard;
