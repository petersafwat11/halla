import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAdminHostById, useUpdateHostStatus, useDeleteHost } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { canEditPage, canDeleteOnPage, PAGES } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import {
  HostHeroCard,
  HostStatsRow,
  HostInfoSection,
  HostSubscriptionSection,
  HostAdminActions,
  HostEventsList,
  SubscriptionModal,
} from "../../components/admin-dashboard/hosts";
import { backgrounds, spacing, colors, textStyles } from "../../styles/tokens";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const HostDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { hostId } = route.params;
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.HOSTS);
  const canDelete = canDeleteOnPage(role, PAGES.HOSTS);

  const { data: hostResp, isLoading, error, refetch } = useAdminHostById(hostId);
  const updateStatus = useUpdateHostStatus();
  const deleteHost = useDeleteHost();

  const [subModalVisible, setSubModalVisible] = useState(false);

  if (error) toast.error("Failed to load host details");

  const host = hostResp?.data?.host || null;

  const handleToggleStatus = () => {
    const isActive = host?.status === "active";
    Alert.alert(
      isActive ? "Suspend Host" : "Activate Host",
      isActive
        ? "This host won't be able to create events."
        : "Reactivate this host?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isActive ? "Suspend" : "Activate",
          style: isActive ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateStatus.mutateAsync({
                hostId: host.id || host._id,
                status: isActive ? "suspended" : "active",
              });
              toast.success(`Host ${isActive ? "suspended" : "activated"}`);
              refetch();
            } catch {
              toast.error("Failed to update status");
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Host",
      "This cannot be undone. All host data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHost.mutateAsync(host.id || host._id);
              toast.success("Host deleted");
              navigation.goBack();
            } catch {
              toast.error("Failed to delete host");
            }
          },
        },
      ]
    );
  };

  // ── Loading / not found ────────────────────────────────────────────────────
  if (isLoading || !host) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title="Host Details" showBack={true} />
        <View style={styles.centerState}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary[500]} />
          ) : (
            <Text style={styles.centerText}>Host not found</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const stats = host.statistics || {};
  const events = host.events || [];
  const totalGuests = events.reduce((s, e) => s + (e.guestListLength || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title="Host Details" showBack={true} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HostHeroCard host={host} />

        <HostStatsRow
          totalEvents={stats.totalEvents ?? events.length}
          activeEvents={stats.activeEvents ?? 0}
          totalGuests={totalGuests}
        />

        <HostInfoSection host={host} formatDate={formatDate} />

        <HostSubscriptionSection subscription={host.subscription} formatDate={formatDate} />

        {(canEdit || canDelete) && (
          <HostAdminActions
            host={host}
            canEdit={canEdit}
            canDelete={canDelete}
            onManageSub={() => setSubModalVisible(true)}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            updatePending={updateStatus.isPending}
            deletePending={deleteHost.isPending}
          />
        )}

        <HostEventsList
          events={events}
          onEventPress={(ev) => navigation.navigate("EventDetails", { eventId: ev.id || ev._id })}
        />

        <View style={{ height: spacing[32] }} />
      </ScrollView>

      <SubscriptionModal
        visible={subModalVisible}
        onClose={() => setSubModalVisible(false)}
        host={host}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  scroll: { flex: 1, backgroundColor: backgrounds.artboard },
  content: { padding: spacing[16], gap: spacing[12] },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[12] },
  centerText: { ...textStyles.bodyMedium, color: colors.natural[450] },
});

export default HostDetailsScreen;
