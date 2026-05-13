import React, { useEffect } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAdminStats } from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import TopBar from "../../../components/plans/TopBar";
import AdminStatsGrid from "./_components/AdminStatsGrid";
import AdminSubscriptionsChart from "./_components/AdminSubscriptionsChart";
import AdminMonthlyEventsChart from "./_components/AdminMonthlyEventsChart";
import AdminEventsStatusChart from "./_components/AdminEventsStatusChart";
import AdminGuestStatsChart from "./_components/AdminGuestStatsChart";
import AdminTicketsChart from "./_components/AdminTicketsChart";
import AdminRecentHosts from "./_components/AdminRecentHosts";
import AdminRecentEvents from "./_components/AdminRecentEvents";
import AdminTopVendors from "./_components/AdminTopVendors";
import {
  colors,
  spacing,
  backgrounds,
} from "../../../styles/tokens";

const AdminDashboardScreen = () => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const role = user?.role;
  const { data, isLoading, error, refetch } = useAdminStats();

  useEffect(() => {
    if (error) toast.error(t("common.error"));
  }, [error]);

  const isWhitelabelRole =
    role === "whitelabel_admin" || role === "whitelabel_moderator";

  const backendCards = data?.statsCards?.length ? data.statsCards : null;

  const statsCards = (() => {
    if (isWhitelabelRole) {
      const eventsCard = backendCards?.find((c) => c.id === "events") || {};
      const hostsCard = backendCards?.find((c) => c.id === "hosts") || {};
      const analytics = data?.analytics || {};
      return [
        {
          id: "total-events",
          icon: "calendar",
          title: t("stats.whitelabel.totalEvents", "Total Events"),
          value: eventsCard.value ?? 0,
          subtitle: t("stats.whitelabel.activeEventsCount", "{{count}} active", { count: analytics.activeEvents ?? 0 }),
        },
        {
          id: "active-events",
          icon: "calendar-check",
          title: t("stats.whitelabel.activeEvents", "Active Events"),
          value: analytics.activeEvents ?? 0,
          subtitle: t("stats.whitelabel.scheduledCount", "{{count}} scheduled", { count: analytics.eventsByStatus?.scheduled ?? 0 }),
        },
        {
          id: "total-hosts",
          icon: "users",
          title: t("stats.whitelabel.totalClients", "Total Clients"),
          value: hostsCard.value ?? 0,
          subtitle: hostsCard.subtitle
            ? t(hostsCard.subtitle.labelKey, { count: hostsCard.subtitle.count })
            : "",
        },
        {
          id: "total-guests",
          icon: "guests",
          title: t("stats.whitelabel.totalGuests", "Total Guests"),
          value: analytics.totalGuests ?? 0,
          subtitle: "",
        },
      ];
    }

    if (backendCards) {
      return backendCards.map((card) => ({
        id: card.id,
        icon: card.icon,
        title: card.titleKey ? t(card.titleKey) : card.title,
        value: card.value ?? "—",
        subtitle: card.subtitle?.labelKey
          ? t(card.subtitle.labelKey, { count: card.subtitle.count })
          : null,
      }));
    }

    return [
      { id: "hosts", icon: "users", title: t("stats.hosts.title"), value: "—", subtitle: null },
      { id: "events", icon: "calendar", title: t("stats.events.title"), value: "—", subtitle: null },
      { id: "vendors", icon: "store", title: t("stats.vendors.title"), value: "—", subtitle: null },
      { id: "tickets", icon: "ticket", title: t("stats.tickets.title"), value: "—", subtitle: null },
    ];
  })();

  const chartsData = data?.charts || {};
  const analytics = data?.analytics || {};
  const recentHosts = (data?.recentActivity?.hosts ?? []).slice(0, 5);
  const recentEvents = (data?.recentActivity?.events ?? []).slice(0, 5);
  const topVendors = (data?.bestVendors ?? []).slice(0, 5);

  if (isLoading && !data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <TopBar title={t("dashboard.title")} />
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
        <TopBar title={`${t("dashboard.welcome")}, ${user?.name || t("common.admin")}`} />
        <ScrollView
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          contentContainerStyle={styles.scrollContent}
        >
          <AdminStatsGrid statsCards={statsCards} />

          {isWhitelabelRole ? (
            <>
              <AdminMonthlyEventsChart
                monthlyEvents={analytics.monthlyEvents || []}
                t={t}
              />
              <AdminEventsStatusChart
                eventsByStatus={analytics.eventsByStatus || {}}
                t={t}
              />
            </>
          ) : (
            <>
              <AdminSubscriptionsChart
                subscriptionsByPlan={chartsData.subscriptionsByPlan || {}}
                t={t}
              />
              <AdminGuestStatsChart
                guestStats={chartsData.guestStats}
                t={t}
              />
              <AdminTicketsChart
                tickets={chartsData.tickets || {}}
                t={t}
              />
            </>
          )}

          <AdminRecentHosts hosts={recentHosts} t={t} onViewAll={() => navigation.navigate("Hosts")} />

          <AdminRecentEvents events={recentEvents} t={t} onViewAll={() => navigation.navigate("Events")} />

          {!isWhitelabelRole && (
            <AdminTopVendors vendors={topVendors} t={t} onViewAll={() => navigation.navigate("AdminVendorsList")} />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: spacing[16], gap: spacing[12] },
});

export default AdminDashboardScreen;
