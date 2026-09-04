import React from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import AdaptiveText from "../commen/AdaptiveText";
import LocalizedText from "../commen/LocalizedText";
import { getLocalized, formatCount } from "@halaa/shared/utils/locale";
import {
  colors,
  spacing,
  borderRadius,
  text,
} from "../../styles/tokens";

const getNotificationIconName = (type) => {
  const iconMap = {
    event_created: "calendar-outline",
    event_reminder: "time-outline",
    event_status_change: "calendar-outline",
    event_completed: "checkmark-circle-outline",
    event_cancelled: "close-circle-outline",
    guest_rsvp_accepted: "person-outline",
    guest_rsvp_declined: "person-remove-outline",
    guest_checked_in: "checkmark-done-outline",
    invitations_sent: "send-outline",
    subscription_expiring: "time-outline",
    subscription_renewed: "refresh-outline",
    subscription_expired: "alert-circle-outline",
    plan_limit_warning: "warning-outline",
    payment_successful: "card-outline",
    payment_failed: "close-circle-outline",
    user_registered: "person-add-outline",
    vendor_pending_approval: "hourglass-outline",
    vendor_approved: "checkmark-circle-outline",
    vendor_rejected: "person-remove-outline",
    welcome: "sparkles-outline",
    ticket_created: "ticket-outline",
    ticket_assigned: "person-outline",
    ticket_response: "chatbubble-outline",
    ticket_resolved: "checkmark-done-outline",
    system_alert: "alert-circle-outline",
    announcement: "megaphone-outline",
    new_review: "star-outline",
    service_inquiry: "help-circle-outline",
    service_booking: "calendar-outline",
  };
  return iconMap[type] || "notifications-outline";
};

const getPriorityStyles = (priority) => {
  switch (priority) {
    case "urgent":
      return { bg: colors.error[50], icon: colors.error[500] };
    case "high":
      return { bg: colors.warning[50], icon: colors.warning[500] };
    default:
      return { bg: colors.primary[50], icon: colors.primary[500] };
  }
};

/**
 * Relative time is authored per UI locale (blueprint §8 notifications row:
 * "dates formatted and isolated") — the backend's English `timeAgo` token
 * is only a legacy fallback when `createdAt` is missing. Counts are
 * rendered with the locale's digit system.
 */
export const formatRelativeTime = (createdAt, locale, t) => {
  if (!createdAt) return "";
  const diffMs = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const count = (n) => formatCount(n, locale);
  if (days > 0) return t("notifications.time.daysAgo", { count: count(days) });
  if (hours > 0) return t("notifications.time.hoursAgo", { count: count(hours) });
  if (minutes > 0)
    return t("notifications.time.minutesAgo", { count: count(minutes) });
  return t("notifications.time.justNow");
};

export const NotificationItem = ({ item, onPress, onDelete }) => {
  const { t, currentLanguage } = useTranslation("common");
  const locale = currentLanguage || "ar";
  const id = item.id || item._id;
  const iconName = getNotificationIconName(item.type);
  const { bg: iconBg, icon: iconColor } = getPriorityStyles(item.priority);

  // Bilingual backend payload: pick the variant for the UI locale first,
  // then let AdaptiveText resolve the direction of whatever script the
  // value actually is (a Latin title in the Arabic UI must stay LTR).
  const title = getLocalized(item, "title", locale, item.title);
  const message = getLocalized(item, "message", locale, item.message);
  const timeLabel =
    formatRelativeTime(item.createdAt, locale, t) || item.timeAgo || "";

  return (
    <TouchableOpacity
      style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      {/* Unread accent anchored at the logical start edge. */}
      {!item.isRead && <View style={styles.unreadAccent} />}

      {/* Priority glyph: semantic leading slot, never mirrored (§7). */}
      <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>

      <View style={styles.notifContent}>
        <AdaptiveText style={styles.notifTitle} numberOfLines={1}>
          {title}
        </AdaptiveText>
        <AdaptiveText style={styles.notifMessage} numberOfLines={2}>
          {message}
        </AdaptiveText>
        <View style={styles.notifMeta}>
          <LocalizedText role="caption" style={styles.notifTime}>
            {timeLabel}
          </LocalizedText>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={t("notifications.delete")}
      >
        {/* Close/dismiss glyph: not mirrored; sits at the logical end. */}
        <Ionicons name="close" size={16} color={colors.natural[350]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const EmptyState = () => {
  const { t } = useTranslation("common");
  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="notifications-off-outline"
        size={64}
        color={colors.natural[300]}
      />
      <LocalizedText role="label" center style={styles.emptyTitle}>
        {t("notifications.empty.title")}
      </LocalizedText>
      <LocalizedText role="description" center style={styles.emptyMessage}>
        {t("notifications.empty.message")}
      </LocalizedText>
    </View>
  );
};

export const LoadMoreFooter = ({ hasNextPage, isFetchingNextPage, onLoadMore }) => {
  const { t } = useTranslation("common");
  if (!hasNextPage) return null;
  return (
    <TouchableOpacity
      style={styles.loadMoreBtn}
      onPress={onLoadMore}
      accessibilityRole="button"
    >
      {isFetchingNextPage ? (
        <ActivityIndicator size="small" color={colors.primary[500]} />
      ) : (
        <LocalizedText role="label" center style={styles.loadMoreText}>
          {t("notifications.loadMore")}
        </LocalizedText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.natural[50],
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[20],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  notifItemUnread: {
    backgroundColor: colors.primary[50],
  },
  unreadAccent: {
    position: "absolute",
    start: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius[4],
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[8],
    justifyContent: "center",
    alignItems: "center",
    marginEnd: spacing[12],
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
    marginEnd: spacing[8],
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: text.title.black,
    marginBottom: 2,
    lineHeight: 20,
  },
  notifMessage: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: text.body.description,
    lineHeight: 19,
    marginBottom: spacing[4],
  },
  notifMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  notifTime: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: text.body.dimmed,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  deleteBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius[4],
    flexShrink: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[40],
    paddingVertical: spacing[60],
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: text.title.black,
    marginTop: spacing[16],
    marginBottom: spacing[8],
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: text.body.description,
    textAlign: "center",
    lineHeight: 22,
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.natural[150],
    backgroundColor: colors.natural[50],
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: colors.primary[500],
  },
});
