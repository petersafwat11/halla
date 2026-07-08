import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
    guest_rsvp_maybe: "help-circle-outline",
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

export const NotificationItem = ({
  item,
  isArabic,
  onPress,
  onDelete,
}) => {
  const id = item.id || item._id;
  const iconName = getNotificationIconName(item.type);
  const { bg: iconBg, icon: iconColor } = getPriorityStyles(item.priority);
  const title = isArabic && item.titleAr ? item.titleAr : item.title;
  const message = isArabic && item.messageAr ? item.messageAr : item.message;

  return (
    <TouchableOpacity
      style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {!item.isRead && <View style={styles.unreadAccent} />}

      <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>

      <View style={styles.notifContent}>
        <Text style={styles.notifTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {message}
        </Text>
        <View style={styles.notifMeta}>
          <Text style={styles.notifTime}>{item.timeAgo || ""}</Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={colors.natural[350]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const EmptyState = ({ t }) => (
  <View style={styles.emptyContainer}>
    <Ionicons
      name="notifications-off-outline"
      size={64}
      color={colors.natural[300]}
    />
    <Text style={styles.emptyTitle}>{t("notifications.empty.title")}</Text>
    <Text style={styles.emptyMessage}>
      {t("notifications.empty.message")}
    </Text>
  </View>
);

export const LoadMoreFooter = ({ hasNextPage, isFetchingNextPage, onLoadMore, t }) => {
  if (!hasNextPage) return null;
  return (
    <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore}>
      {isFetchingNextPage ? (
        <ActivityIndicator size="small" color={colors.primary[500]} />
      ) : (
        <Text style={styles.loadMoreText}>{t("notifications.loadMore")}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = {
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
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary[500],
    borderTopRightRadius: borderRadius[4],
    borderBottomRightRadius: borderRadius[4],
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[8],
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing[12],
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing[8],
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
};
