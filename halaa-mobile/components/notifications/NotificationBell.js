import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUnreadCount } from "../../hooks/notifications";
import { useTranslation } from "../../localization";
import { formatCount } from "@halaa/shared/utils/locale";
import { parseUnreadCount } from "../../utils/notificationCount";

export { parseUnreadCount };

/**
 * Icon-only action (blueprint §7): semantic bell glyph is never mirrored,
 * the badge is a full-width overlay anchored at the physical corner of the
 * 32px control (equal hit slop geometry), and its count plus accessibility
 * label are locale-formatted rather than raw Latin digits/English copy.
 */
const MAX_BADGE_COUNT = 99;

const NotificationBell = ({ onPress, color = "#F9F4EF", size = 20 }) => {
  const { t, currentLanguage } = useTranslation("common");
  const { data: unreadData } = useUnreadCount();
  const unreadCount = parseUnreadCount(unreadData?.count);

  const displayCount = (count) => {
    if (count > MAX_BADGE_COUNT) {
      return `${formatCount(MAX_BADGE_COUNT, currentLanguage)}+`;
    }
    return formatCount(count, currentLanguage);
  };

  const accessibilityLabel =
    unreadCount > 0
      ? t("notifications.unreadBadge", {
          count: displayCount(unreadCount),
          defaultValue: t("notifications.title"),
        })
      : t("notifications.title");

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          {/* Standalone numeric token: pinned LTR so the "+" suffix cannot
              reorder around digits inside RTL chrome. */}
          <Text style={[styles.badgeText, { writingDirection: "ltr" }]}>
            {displayCount(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    end: 0,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Cairo_700Bold",
    lineHeight: 14,
  },
});

export default NotificationBell;
