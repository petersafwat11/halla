import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAdminStats } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import TopBar from "../../components/plans/TopBar";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../styles/tokens";

const ICON_MAP = {
  users: { name: "people-outline", color: colors.primary[500] },
  store: { name: "storefront-outline", color: "#C28E5C" },
  calendar: { name: "calendar-outline", color: "#3498DB" },
  "credit-card": { name: "card-outline", color: "#9B59B6" },
  ticket: { name: "ticket-outline", color: colors.warning[500] },
};

const PLAN_COLORS = [
  "#3498DB",
  colors.primary[500],
  "#9B59B6",
  colors.success[500],
  colors.warning[500],
];

const EVENT_STATUS_COLORS = {
  live: colors.success[500],
  scheduled: "#3498DB",
  draft: colors.natural[400],
  completed: colors.natural[350],
  cancelled: colors.error[500],
  pending: colors.warning[500],
  upcoming: "#3498DB",
  ongoing: colors.success[500],
};

const HOST_STATUS_COLORS = {
  active: colors.success[500],
  pending: colors.warning[500],
  suspended: colors.error[500],
  inactive: colors.natural[400],
};

const AdminDashboardScreen = () => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const role = user?.role;
  const { data, isLoading, error, refetch } = useAdminStats();

  if (error) toast.error(t("common.error"));

  const statsCards = data?.statsCards?.length
    ? data.statsCards
    : [
        { id: "hosts", icon: "users", title: t("dashboard.stats.totalHosts"), value: "—", subtitle: null },
        { id: "events", icon: "calendar", title: t("dashboard.stats.activeEvents"), value: "—", subtitle: null },
        { id: "vendors", icon: "store", title: t("dashboard.stats.totalVendors"), value: "—", subtitle: null },
        { id: "tickets", icon: "ticket", title: t("dashboard.stats.openTickets"), value: "—", subtitle: null },
      ];

  const subscriptionsByPlan = data?.charts?.subscriptionsByPlan ?? {};
  const planEntries = Object.entries(subscriptionsByPlan);
  const totalSubs = planEntries.reduce((sum, [, count]) => sum + count, 0);

  const recentHosts = (data?.recentActivity?.hosts ?? []).slice(0, 5);
  const recentEvents = (data?.recentActivity?.events ?? []).slice(0, 5);
  const topVendors = (data?.bestVendors ?? []).slice(0, 5);

  const renderSectionHeader = (icon, title, onViewAll) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={icon} size={18} color={colors.primary[500]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
        <TopBar title={`${t("dashboard.welcome")}, ${user?.name || "Admin"}`} />
        <ScrollView
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. Stats Grid */}
          <View style={styles.statsGrid}>
            {statsCards.map((item) => {
              const iconConfig = ICON_MAP[item.icon] ?? {
                name: "stats-chart-outline",
                color: colors.natural[400],
              };
              return (
                <View key={item.id ?? item.title} style={styles.statChip}>
                  <View style={[styles.statIconBox, { backgroundColor: `${iconConfig.color}18` }]}>
                    <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
                  </View>
                  <View style={styles.statTextCol}>
                    <Text style={styles.statValue}>{item.value ?? "—"}</Text>
                    <Text style={styles.statLabel} numberOfLines={1}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text style={styles.statSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* 2. Subscriptions by Plan */}
          <View style={styles.card}>
            {renderSectionHeader("pie-chart-outline", t("dashboard.charts.subscriptions"))}
            {planEntries.length === 0 ? (
              <Text style={styles.emptyText}>{t("dashboard.charts.noData")}</Text>
            ) : (
              <>
                <View style={styles.segmentedBar}>
                  {planEntries.map(([plan, count], idx) => (
                    <View
                      key={plan}
                      style={{
                        flex: count / totalSubs,
                        height: 8,
                        backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length],
                        borderRadius: borderRadius[8],
                      }}
                    />
                  ))}
                </View>
                {planEntries.map(([plan, count], idx) => (
                  <View key={plan} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }]} />
                    <Text style={styles.legendName}>{plan}</Text>
                    <Text style={styles.legendCount}>{count}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* 3. Recent Hosts */}
          {recentHosts.length > 0 && (
            <View style={styles.card}>
              {renderSectionHeader(
                "people-outline",
                t("dashboard.recentHosts.title"),
                () => navigation.navigate("Hosts")
              )}
              {recentHosts.map((host, idx) => {
                const name = host.username || host.name || "—";
                const initial = name.charAt(0).toUpperCase();
                const statusColor = HOST_STATUS_COLORS[host.status] ?? colors.natural[400];
                return (
                  <React.Fragment key={host._id ?? host.id ?? idx}>
                    {idx > 0 && <View style={styles.divider} />}
                    <View style={styles.listRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initial}</Text>
                      </View>
                      <View style={styles.listRowContent}>
                        <Text style={styles.listRowName} numberOfLines={1}>{name}</Text>
                        <Text style={styles.listRowSub} numberOfLines={1}>{host.email}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {t(`hosts.status.${host.status}`) || host.status}
                        </Text>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {/* 4. Recent Events */}
          {recentEvents.length > 0 && (
            <View style={styles.card}>
              {renderSectionHeader(
                "calendar-outline",
                t("dashboard.recentEvents.title"),
                () => navigation.navigate("Events")
              )}
              {recentEvents.map((event, idx) => {
                const statusColor = EVENT_STATUS_COLORS[event.status] ?? colors.natural[400];
                const dateStr = event.date
                  ? new Date(event.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";
                return (
                  <React.Fragment key={event._id ?? event.id ?? idx}>
                    {idx > 0 && <View style={styles.divider} />}
                    <View style={styles.eventRow}>
                      <View style={[styles.eventStrip, { backgroundColor: statusColor }]} />
                      <View style={styles.listRowContent}>
                        <Text style={styles.listRowName} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.listRowSub} numberOfLines={1}>
                          {event.host} · {dateStr}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {t(`events.status.${event.status}`) || event.status}
                        </Text>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {/* 5. Top Vendors — hidden for whitelabel_admin */}
          {role !== "whitelabel_admin" && topVendors.length > 0 && (
            <View style={styles.card}>
              {renderSectionHeader(
                "storefront-outline",
                t("dashboard.topVendors.title"),
                () => navigation.navigate("AdminVendorsList")
              )}
              {topVendors.map((vendor, idx) => (
                <React.Fragment key={vendor.name ?? idx}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.listRow}>
                    <Text style={styles.rankNumber}>{idx + 1}</Text>
                    <Text style={styles.vendorName} numberOfLines={1}>{vendor.name}</Text>
                    <Text style={styles.clicksCount}>
                      {vendor.numberOfClicks}{" "}
                      <Text style={styles.clicksLabel}>{t("dashboard.topVendors.clicks")}</Text>
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
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

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  statChip: {
    flexBasis: "47%",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius[8],
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  statTextCol: { flex: 1 },
  statValue: {
    fontSize: typography.fontSize.title.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  statLabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
    marginTop: 1,
  },
  statSubtitle: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[350],
    fontWeight: typography.fontWeight.regular,
    marginTop: 1,
  },

  // Card container
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[12],
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  sectionTitle: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  viewAllText: {
    ...textStyles.labelLarge,
    color: colors.primary[500],
  },

  // Subscriptions chart
  segmentedBar: {
    flexDirection: "row",
    gap: 2,
    marginBottom: spacing[12],
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[4],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    ...textStyles.labelLarge,
    color: colors.natural[700],
    flex: 1,
  },
  legendCount: {
    ...textStyles.labelLarge,
    color: colors.natural[500],
    fontWeight: typography.fontWeight.semibold,
  },
  emptyText: {
    ...textStyles.bodySmall,
    color: colors.natural[350],
    textAlign: "center",
    paddingVertical: spacing[8],
  },

  // List rows
  divider: {
    height: 1,
    backgroundColor: colors.natural[200],
    marginVertical: spacing[8],
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  listRowContent: { flex: 1 },
  listRowName: {
    ...textStyles.bodyMedium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
  },
  listRowSub: {
    ...textStyles.labelMedium,
    color: colors.natural[450],
    marginTop: 2,
  },

  // Avatar
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[8],
  },
  statusText: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.medium,
  },

  // Event row
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  eventStrip: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: borderRadius[4],
    minHeight: 36,
    flexShrink: 0,
  },

  // Vendor rank
  rankNumber: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
    width: 20,
    textAlign: "center",
    flexShrink: 0,
  },
  vendorName: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    flex: 1,
  },
  clicksCount: {
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[500],
  },
  clicksLabel: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.regular,
    color: colors.natural[400],
  },
});

export default AdminDashboardScreen;
