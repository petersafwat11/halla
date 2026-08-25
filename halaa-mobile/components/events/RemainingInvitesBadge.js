import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCount } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";

/**
 * "Remaining invites" badge on the single-event page (blueprint §8
 * "Event details" row). `null` remaining means truly unlimited.
 *
 * Content classification:
 *  - label + helper → localized application copy, always following the UI
 *    locale through LocalizedText;
 *  - value → locale-formatted count digits, or a keyed "unlimited" string.
 *
 * The icon is semantic (send), not navigation — never mirrored. The row is a
 * normal logical row: icon → label → value at the logical end.
 */
const RemainingInvitesBadge = ({ remaining }) => {
  const { t, currentLanguage } = useTranslation("events");

  return (
    <View style={styles.badge}>
      <View style={styles.badgeRow}>
        <Ionicons name="paper-plane-outline" size={16} color="#6B4E33" />
        <LocalizedText style={styles.badgeLabel}>
          {t("remainingInvites.label")}
        </LocalizedText>
        <LocalizedText style={styles.badgeValue}>
          {remaining == null
            ? t("remainingInvites.unlimited")
            : formatCount(remaining, currentLanguage)}
        </LocalizedText>
      </View>
      <LocalizedText style={styles.badgeHelp}>
        {t("remainingInvites.helper")}
      </LocalizedText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8D4C4",
    padding: 12,
    marginHorizontal: 4,
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
  badgeValue: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
  },
  badgeHelp: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#9CA3AF",
    lineHeight: 16,
  },
});

export default RemainingInvitesBadge;
