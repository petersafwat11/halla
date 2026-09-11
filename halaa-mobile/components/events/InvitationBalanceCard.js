import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { formatCount, getLocalized } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";

/**
 * Reusable Host Invitation Balance Card (PR4 / F-11)
 *
 * Rendered on host Home and Event Details.
 * Displays:
 *  - Remaining invites prominently (or explicit "Unlimited" copy).
 *  - Used / Total secondarily (never mixed with RSVP state counts).
 *  - "Add More" action button only when purchasable (not unlimited),
 *    navigating to a typed return destination.
 *
 * @param {Object} props
 * @param {Object} props.balance - Canonical invitationBalance DTO { unlimited, base, compensation, consumed, total, remaining }
 * @param {string} [props.returnTo="EventDetails"] - Typed return destination
 * @param {string} [props.eventId] - Associated event ID
 * @param {boolean} [props.purchasable] - Override purchasable flag (defaults to !balance.unlimited)
 * @param {boolean} [props.compact] - Compact row variant for home widget
 * @param {Object} [props.style] - Container style override
 */
export default function InvitationBalanceCard({
  balance,
  returnTo = "EventDetails",
  eventId,
  purchasable,
  compact = false,
  style,
  currentSubscription,
}) {
  const { t, currentLanguage } = useTranslation("events");
  const navigation = useNavigation();
  const locale = currentLanguage || "ar";

  if (!balance) return null;

  const isUnlimited = Boolean(balance.unlimited);
  const isPurchasable = purchasable !== undefined ? purchasable : !isUnlimited;

  const handleAddMore = () => {
    navigation.navigate("MainTabs", {
      screen: "Plans",
      params: {
        origin: "invitation_balance",
        returnTo,
        eventId: eventId ? String(eventId) : null,
      },
    });
  };

  const remainingDisplay = isUnlimited
    ? t("invitationBalance.unlimited", "غير محدود")
    : formatCount(balance.remaining ?? 0, locale);

  const consumedDisplay = formatCount(balance.consumed ?? 0, locale);
  const totalDisplay = isUnlimited
    ? t("invitationBalance.unlimited", "غير محدود")
    : formatCount(balance.total ?? 0, locale);
  const currentPlan = currentSubscription?.planId || currentSubscription?.plan;
  const currentPlanName =
    getLocalized(currentSubscription, "planName", locale) ||
    getLocalized(currentPlan, "name", locale) ||
    currentSubscription?.planName?.[locale] ||
    currentSubscription?.planName ||
    currentPlan?.name ||
    currentPlan?.code ||
    currentSubscription?.planCode ||
    currentSubscription?.planType;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactMain}>
          <Ionicons name="paper-plane-outline" size={18} color="#6B4E33" />
          <View style={styles.compactTextGroup}>
            <LocalizedText style={styles.compactLabel}>
              {t("invitationBalance.remaining", "الدعوات المتبقية")}
            </LocalizedText>
            <LocalizedText style={styles.compactValue}>{remainingDisplay}</LocalizedText>
            <LocalizedText style={styles.secondaryText}>
              {t("invitationBalance.used", "المستخدم")}{": "}
              {t("invitationBalance.usedOfTotal", "{{used}} من {{total}}", {
                used: consumedDisplay,
                total: totalDisplay,
              })}
            </LocalizedText>
          </View>
        </View>

        <View style={styles.compactEnd}>
          {isPurchasable && (
            <TouchableOpacity
              style={styles.compactAddButton}
              onPress={handleAddMore}
              accessibilityRole="button"
              accessibilityLabel={t("invitationBalance.addMore", "إضافة المزيد")}
            >
              <LocalizedText style={styles.compactAddButtonText}>
                {t("invitationBalance.addMore", "إضافة المزيد")}
              </LocalizedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.group}>
      {currentPlanName ? (
        <View style={styles.currentPlan} accessibilityRole="summary">
          <LocalizedText style={styles.currentPlanLabel}>
            {t("currentPlan.label")}
          </LocalizedText>
          <LocalizedText style={styles.currentPlanName}>{currentPlanName}</LocalizedText>
          <LocalizedText style={styles.currentPlanNote}>
            {t("currentPlan.eventAllowanceNote")}
          </LocalizedText>
        </View>
      ) : null}
    <View style={[styles.card, style]}>
      <LocalizedText style={styles.title}>{t("invitationBalance.remaining")}</LocalizedText>
      <View style={styles.balanceRow}>
        <View style={styles.balanceCopy}>
          <LocalizedText style={styles.value}>{remainingDisplay}</LocalizedText>
          <LocalizedText style={styles.usage}>
            {t("invitationBalance.usageSummary", { used: consumedDisplay, total: totalDisplay })}
          </LocalizedText>
        </View>
        {isPurchasable && <TouchableOpacity style={styles.addMoreButton} onPress={handleAddMore} accessibilityRole="button" accessibilityLabel={t("invitationBalance.addMore")}>
          <Ionicons name="add" size={18} color="#6B4E33" />
          <LocalizedText style={styles.addMoreText}>{t("invitationBalance.addMore")}</LocalizedText>
        </TouchableOpacity>}
      </View>
      <View style={styles.helperRow}>
        <LocalizedText style={styles.helper}>{t("invitationBalance.helper")}</LocalizedText>
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  currentPlan: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E8D4C4", padding: 14, marginHorizontal: 4, gap: 3 },
  currentPlanLabel: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#756757" },
  currentPlanName: { fontSize: 16, fontFamily: "Cairo_700Bold", color: "#6B4E33" },
  currentPlanNote: { marginTop: 3, fontSize: 11, lineHeight: 18, fontFamily: "Cairo_400Regular", color: "#756757" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E8D4C4", padding: 18, marginHorizontal: 4, marginVertical: 6, gap: 12 },
  title: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: "#4A3D33", lineHeight: 24 },
  balanceRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 },
  balanceCopy: { flexGrow: 1, flexShrink: 1, minWidth: 120 },
  value: { fontSize: 32, fontFamily: "Cairo_700Bold", color: "#6B4E33", lineHeight: 44 },
  usage: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#656565", lineHeight: 22 },
  addMoreButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#F9F4EF", borderRadius: 10, borderWidth: 1, borderColor: "#D9C3B0" },
  addMoreText: { fontSize: 14, lineHeight: 22, fontFamily: "Cairo_600SemiBold", color: "#6B4E33" },
  helperRow: { borderTopWidth: 1, borderTopColor: "#F0E7DE", paddingTop: 12 },
  helper: { fontSize: 12, lineHeight: 20, fontFamily: "Cairo_400Regular", color: "#656565" },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9F4EF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    padding: 16,
    gap: 16,
    flexWrap: "wrap",
    marginVertical: 4,
  },
  compactMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    minWidth: 150,
  },
  compactTextGroup: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
  },
  secondaryText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
  },
  compactEnd: {
    alignItems: "flex-end",
    gap: 4,
  },
  compactValue: {
    fontSize: 28,
    lineHeight: 38,
    marginVertical: 4,
    fontFamily: "Cairo_700Bold",
    color: "#6B4E33",
  },
  compactAddButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9C3B0",
  },
  compactAddButtonText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
});
