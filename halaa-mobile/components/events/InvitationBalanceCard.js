import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { formatCount } from "@halaa/shared/utils/locale";
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

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactMain}>
          <Ionicons name="paper-plane-outline" size={18} color="#6B4E33" />
          <View style={styles.compactTextGroup}>
            <LocalizedText style={styles.compactLabel}>
              {t("invitationBalance.remaining", "الدعوات المتبقية")}
            </LocalizedText>
            <LocalizedText style={styles.secondaryText}>
              {t("invitationBalance.usedOfTotal", "{{used}} من {{total}}", {
                used: consumedDisplay,
                total: totalDisplay,
              })}
            </LocalizedText>
          </View>
        </View>

        <View style={styles.compactEnd}>
          <LocalizedText style={styles.compactValue}>
            {remainingDisplay}
          </LocalizedText>
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
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="paper-plane-outline" size={18} color="#6B4E33" />
          </View>
          <View>
            <LocalizedText style={styles.title}>
              {t("invitationBalance.remaining", "الدعوات المتبقية")}
            </LocalizedText>
            <LocalizedText style={styles.helper}>
              {t(
                "invitationBalance.helper",
                "إضافة الضيوف مجانية؛ يتم خصم الرصيد فقط عند إرسال دعوة أو تذكير."
              )}
            </LocalizedText>
          </View>
        </View>

        {isPurchasable && (
          <TouchableOpacity
            style={styles.addMoreButton}
            onPress={handleAddMore}
            accessibilityRole="button"
            accessibilityLabel={t("invitationBalance.addMore", "إضافة المزيد")}
          >
            <Ionicons name="add-circle-outline" size={16} color="#6B4E33" />
            <LocalizedText style={styles.addMoreText}>
              {t("invitationBalance.addMore", "إضافة المزيد")}
            </LocalizedText>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bodyRow}>
        {/* Prominent remaining count */}
        <View style={styles.prominentStat}>
          <LocalizedText style={styles.prominentValue}>
            {remainingDisplay}
          </LocalizedText>
          <LocalizedText style={styles.statSublabel}>
            {isUnlimited
              ? t("invitationBalance.unlimitedPlan", "باقة غير محدودة")
              : t("invitationBalance.remainingLabel", "دعوة متبقية")}
          </LocalizedText>
        </View>

        {/* Secondary stats (Used / Total) */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStatItem}>
            <LocalizedText style={styles.secondaryLabel}>
              {t("invitationBalance.used", "المستخدم")}
            </LocalizedText>
            <LocalizedText style={styles.secondaryValue}>
              {consumedDisplay}
            </LocalizedText>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.secondaryStatItem}>
            <LocalizedText style={styles.secondaryLabel}>
              {t("invitationBalance.total", "الإجمالي")}
            </LocalizedText>
            <LocalizedText style={styles.secondaryValue}>
              {totalDisplay}
            </LocalizedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    padding: 16,
    marginHorizontal: 4,
    marginVertical: 6,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F9F4EF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 20,
  },
  helper: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#8C8C8C",
    lineHeight: 16,
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F9F4EF",
    borderWidth: 1,
    borderColor: "#D9C3B0",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addMoreText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F4EBE2",
  },
  prominentStat: {
    alignItems: "flex-start",
  },
  prominentValue: {
    fontSize: 26,
    fontFamily: "Cairo_700Bold",
    color: "#6B4E33",
    lineHeight: 34,
  },
  statSublabel: {
    fontSize: 12,
    fontFamily: "Cairo_500Medium",
    color: "#656565",
  },
  secondaryStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBF8F5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 12,
  },
  secondaryStatItem: {
    alignItems: "center",
  },
  secondaryLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#8C8C8C",
  },
  secondaryValue: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E8D4C4",
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9F4EF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 4,
  },
  compactMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  compactTextGroup: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#2C2C2C",
  },
  secondaryText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
  },
  compactEnd: {
    alignItems: "flex-end",
    gap: 4,
  },
  compactValue: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#6B4E33",
  },
  compactAddButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D9C3B0",
  },
  compactAddButtonText: {
    fontSize: 10,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
});
