import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "../localization";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from "../hooks";
import { TopBar } from "../components/plans";
import {
  colors,
  backgrounds,
  text,
  spacing,
  borderRadius,
} from "../styles/tokens";

// ─── Icon mapping ────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { t, currentLanguage } = useTranslation("common");
  const navigation = useNavigation();
  const isArabic = currentLanguage === "ar";

  const {
    data: notifData,
    isLoading,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useNotifications({ limit: 20 });

  const { refetch: refetchUnread } = useUnreadCount();

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const clearAllMutation = useClearAllNotifications();

  const notifications = useMemo(() => {
    if (!notifData?.pages) return [];
    return notifData.pages.flatMap((page) => page.notifications);
  }, [notifData]);

  const handleBack = () => {
    if (navigation?.canGoBack()) navigation.goBack();
  };

  const handleNotificationPress = useCallback(
    async (notification) => {
      if (!notification.isRead) {
        try {
          await markAsReadMutation.mutateAsync(
            notification.id || notification._id
          );
          refetchUnread();
        } catch (e) {
          console.error("Failed to mark as read:", e);
        }
      }
    },
    [markAsReadMutation, refetchUnread]
  );

  const handleDelete = useCallback(
    (id) => {
      Alert.alert(
        t("notifications.delete"),
        "",
        [
          { text: t("buttons.cancel"), style: "cancel" },
          {
            text: t("buttons.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteNotificationMutation.mutateAsync(id);
                refetchUnread();
              } catch (e) {
                console.error("Failed to delete notification:", e);
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [deleteNotificationMutation, refetchUnread, t]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      refetchUnread();
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  }, [markAllAsReadMutation, refetchUnread]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      t("notifications.clearAll"),
      t("notifications.clearAllConfirm"),
      [
        { text: t("buttons.cancel"), style: "cancel" },
        {
          text: t("buttons.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllMutation.mutateAsync();
              refetchUnread();
            } catch (e) {
              console.error("Failed to clear all:", e);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [clearAllMutation, refetchUnread, t]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const handleRefresh = () => {
    refetch();
    refetchUnread();
  };

  // ─── Header actions ─────────────────────────────────────────────────────

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity
        onPress={handleMarkAllAsRead}
        style={styles.headerActionBtn}
        disabled={markAllAsReadMutation.isPending}
        accessibilityLabel={t("notifications.markAllRead")}
      >
        <Ionicons
          name="checkmark-done-outline"
          size={20}
          color={colors.natural[50]}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleClearAll}
        style={styles.headerActionBtn}
        disabled={clearAllMutation.isPending}
        accessibilityLabel={t("notifications.clearAll")}
      >
        <Ionicons name="trash-outline" size={20} color={colors.natural[50]} />
      </TouchableOpacity>
    </View>
  );

  // ─── Render item ─────────────────────────────────────────────────────────

  const renderNotification = ({ item }) => {
    const id = item.id || item._id;
    const iconName = getNotificationIconName(item.type);
    const { bg: iconBg, icon: iconColor } = getPriorityStyles(item.priority);
    const title = isArabic && item.titleAr ? item.titleAr : item.title;
    const message =
      isArabic && item.messageAr ? item.messageAr : item.message;

    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Unread accent bar */}
        {!item.isRead && <View style={styles.unreadAccent} />}

        {/* Icon */}
        <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>

        {/* Content */}
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

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={colors.natural[350]} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ─── Empty state ─────────────────────────────────────────────────────────

  const renderEmpty = () => (
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

  // ─── Load more footer ─────────────────────────────────────────────────────

  const renderFooter = () => {
    if (!hasNextPage) return null;
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
        {isFetchingNextPage ? (
          <ActivityIndicator size="small" color={colors.primary[500]} />
        ) : (
          <Text style={styles.loadMoreText}>{t("notifications.loadMore")}</Text>
        )}
      </TouchableOpacity>
    );
  };

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <TopBar
            title={t("notifications.title")}
            showBack={navigation?.canGoBack?.()}
            onBack={handleBack}
            rightContent={headerActions}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          title={t("notifications.title")}
          showBack={navigation?.canGoBack?.()}
          onBack={handleBack}
          rightContent={headerActions}
        />

        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary[500],
  },
  container: {
    flex: 1,
    backgroundColor: backgrounds.artboard,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  // List
  listContent: {
    paddingBottom: spacing[40],
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  // Notification item — flat rows with dividers (like web dropdown)
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

  // Left accent stripe for unread
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

  // Icon square
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[8],
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing[12],
    flexShrink: 0,
  },

  // Content
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

  // Delete button
  deleteBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius[4],
    flexShrink: 0,
  },

  // Empty state
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

  // Load more
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
