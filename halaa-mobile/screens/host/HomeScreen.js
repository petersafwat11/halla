import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  LastEvent,
  StatsCards,
  EventTemplates,
  MakeYourFirst,
  TestMessageModal,
  ScheduleSendingModal,
} from "../../components/home";
import { TopBar } from "../../components/plans";
import { useHostDashboard, useBusinessCreateEventGate } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import AdaptiveText from "../../components/commen/AdaptiveText";
import NotificationBell from "../../components/notifications/NotificationBell";
import HomeHeaderContent from "../../components/home/HomeHeaderContent";

const HomeScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation("home");
  const toast = useToast();
  // Business accounts with no active subscription cannot create events
  // (subscription-gated server-side). Reflect that in the create-event entry.
  const { blocked: createEventBlocked } = useBusinessCreateEventGate();
  const [testMessageModalVisible, setTestMessageModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const { data: dashboardData, isLoading: loading, error, refetch } = useHostDashboard();

  const eventId = dashboardData?.lastEvent?.id || dashboardData?.lastEvent?._id;
  const hasEvents = dashboardData?.hasEvents === true;

  const handleEditPress = (step) => {
    if (!eventId) return;
    navigation.navigate("Events", {
      screen: "UpdateEventScreen",
      params: { eventId, step },
    });
  };

  const handleTestMessagePress = () => setTestMessageModalVisible(true);

  const handleViewStatsPress = () => {
    // Match web: View Stats opens THIS event's detail page (web pushes
    // /host/events/{id}), not the events list tab. Fall back to the list
    // only if we somehow have no event id.
    if (!navigation) return;
    if (eventId) {
      navigation.navigate("Events", {
        screen: "EventDetails",
        params: { eventId },
      });
    }
    else navigation.navigate("Events");
  };

  const handleSchedulePress = () => setScheduleModalVisible(true);

  const handleCreateEvent = () => {
    if (!navigation) return;
    // No active subscription (business) → route to the business plans screen
    // for activation instead of opening a wizard that would 403 on submit.
    if (createEventBlocked) {
      toast.info(t("createEvent.businessActivationRequired"));
      navigation.navigate("MainTabs", { screen: "Plans" });
      return;
    }
    navigation.navigate("Events", { screen: "CreateEventScreen" });
  };

  const handlePostEventPress = () => {
    if (!eventId) return;
    navigation.navigate("Events", {
      screen: "ManagePostEvent",
      params: { eventId },
    });
  };

  const topBarActions = (
    <View style={styles.topBarActions}>
      <NotificationBell
        onPress={() => navigation.navigate("Notifications")}
        color="#F9F4EF"
        size={20}
      />
      <TouchableOpacity style={styles.iconButton}>
        <Ionicons name="chatbubbles-outline" size={20} color="#F9F4EF" />
      </TouchableOpacity>
    </View>
  );

  const greetingContent = (
    <View style={styles.greetingContainer}>
      <Text style={styles.greetingText}>{t("welcome")}</Text>
      {/* The account/organization name is backend content: its direction
          follows the first strong character, never the UI locale (§6). */}
      <AdaptiveText style={styles.organizationName} numberOfLines={1}>
        {user?.name || user?.username || t("guest")}
      </AdaptiveText>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar rightContent={topBarActions} leftContent={greetingContent} />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <HomeHeaderContent
                loading={loading}
                error={error}
                hasEvents={hasEvents}
                event={dashboardData?.lastEvent}
                subscription={dashboardData?.subscription}
                onEditPress={handleEditPress}
                onTestMessagePress={handleTestMessagePress}
                onViewStatsPress={handleViewStatsPress}
                onSchedulePress={handleSchedulePress}
                onPostEventPress={handlePostEventPress}
                onCreateEventPress={handleCreateEvent}
                onRetry={() => refetch()}
                t={t}
              />
            </View>
          </View>

          {!loading && hasEvents && (
            <View style={styles.statsSection}>
              <StatsCards
                totalEvents={dashboardData?.stats?.totalEvents || 0}
                activeEvents={dashboardData?.stats?.activeEvents || 0}
                draftEvents={dashboardData?.stats?.draftEvents || 0}
                endedEvents={dashboardData?.stats?.endedEvents || 0}
              />
            </View>
          )}

          <View style={styles.templatesSection}>
            <EventTemplates />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {!loading && hasEvents && (
          <TouchableOpacity
            style={styles.createEventFab}
            onPress={handleCreateEvent}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("quickActions.createEvent")}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createEventFabText}>{t("quickActions.createEvent")}</Text>
          </TouchableOpacity>
        )}

        <TestMessageModal
          visible={testMessageModalVisible}
          onClose={() => setTestMessageModalVisible(false)}
          onSuccess={() => refetch()}
          eventId={eventId}
        />

        <ScheduleSendingModal
          visible={scheduleModalVisible}
          onClose={() => setScheduleModalVisible(false)}
          onSuccess={() => refetch()}
          eventId={eventId}
          existingSchedule={dashboardData?.lastEvent?.launchSettings}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#C28E5C" },
  container: { flex: 1, backgroundColor: "#F9F4EF" },
  header: {
    backgroundColor: "#C28E5C",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  iconButton: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  greetingContainer: { flexDirection: "column", alignItems: "flex-start", gap: 4 },
  greetingText: {
    fontSize: 12, fontFamily: "Cairo_400Regular", color: "#FFF",
    lineHeight: 16,
  },
  organizationName: {
    fontSize: 16, fontFamily: "Cairo_700Bold", color: "#FFF",
    lineHeight: 24, letterSpacing: 0.08,
  },
  headerContent: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 24 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 0 },
  statsSection: { marginBottom: 16 },
  templatesSection: { paddingHorizontal: 24, marginBottom: 16 },
  bottomSpacing: { height: 100 },
  createEventFab: {
    // Semantic floating action anchored at the logical START edge (§7):
    // `start` mirrors under the root RTL so the pill sits on the right in
    // Arabic and the left in English — never a physical `left`.
    position: "absolute", bottom: 20, start: 24,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#C28E5C", paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 8,
  },
  createEventFabText: {
    fontSize: 13, fontFamily: "Cairo_600SemiBold", color: "#FFF",
  },
});

export default HomeScreen;
