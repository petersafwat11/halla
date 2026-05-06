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

  const statsCards = data?.statsCards?.length
    ? data.statsCards
    : [
        { id: "hosts", icon: "users", title: t("dashboard.stats.totalHosts"), value: "—", subtitle: null },
        { id: "events", icon: "calendar", title: t("dashboard.stats.activeEvents"), value: "—", subtitle: null },
        { id: "vendors", icon: "store", title: t("dashboard.stats.totalVendors"), value: "—", subtitle: null },
        { id: "tickets", icon: "ticket", title: t("dashboard.stats.openTickets"), value: "—", subtitle: null },
      ];

  const subscriptionsByPlan = data?.charts?.subscriptionsByPlan ?? {};
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

          <AdminSubscriptionsChart subscriptionsByPlan={subscriptionsByPlan} t={t} />

          <AdminRecentHosts hosts={recentHosts} t={t} onViewAll={() => navigation.navigate("Hosts")} />

          <AdminRecentEvents events={recentEvents} t={t} onViewAll={() => navigation.navigate("Events")} />

          {role !== "whitelabel_admin" && (
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
