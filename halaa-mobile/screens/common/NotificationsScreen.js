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
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from "../../hooks";
import { TopBar } from "../../components/plans";
import {
  colors,
  backgrounds,
  text,
  spacing,
  borderRadius,
  layout,
} from "../../styles/tokens";
import {
  NotificationItem,
  EmptyState,
  LoadMoreFooter,
} from "../../components/notifications/NotificationItem";

export default function NotificationsScreen() {
  const { t } = useTranslation("common");
  const navigation = useNavigation();
  const toast = useToast();

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
          toast.error(t("notifications.markReadError", "Failed to mark as read"));
        }
      }
    },
    [markAsReadMutation, refetchUnread, t, toast]
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
                toast.error(t("notifications.deleteError", "Failed to delete"));
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [deleteNotificationMutation, refetchUnread, t, toast]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      refetchUnread();
    } catch (e) {
      toast.error(t("notifications.markAllError", "Failed to mark all as read"));
    }
  }, [markAllAsReadMutation, refetchUnread, t, toast]);

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
              toast.error(t("notifications.clearAllError", "Failed to clear all"));
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [clearAllMutation, refetchUnread, t, toast]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const handleRefresh = () => {
    refetch();
    refetchUnread();
  };

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity
        onPress={handleMarkAllAsRead}
        style={styles.headerActionBtn}
        disabled={markAllAsReadMutation.isPending}
        accessibilityLabel={t("notifications.markAllRead")}
      >
        {/* Semantic action glyphs — never direction-mirrored (§7). */}
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

  const renderNotification = ({ item }) => (
    <NotificationItem
      item={item}
      onPress={handleNotificationPress}
      onDelete={handleDelete}
    />
  );

  const renderEmpty = () => <EmptyState />;

  const renderFooter = () => (
    <LoadMoreFooter
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={handleLoadMore}
    />
  );

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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  headerActionBtn: {
    // Blueprint §7: icon-only actions need a ≥44×44 logical target.
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: layout.dashboardPageBottom,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
});
