import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Path, Ellipse } from "react-native-svg";
import {
  LastEvent,
  StatsCards,
  EventTemplates,
  MakeYourFirst,
  TestMessageModal,
  ScheduleSendingModal,
} from "../components/home";
import { TopBar } from "../components/plans";
import { useHostDashboard } from "../hooks";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "../localization";
import NotificationBell from "../components/notifications/NotificationBell";
import { useNotifyStaff } from "../hooks/mutations/useEventMutations";

const HomeScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation("home");
  const [testMessageModalVisible, setTestMessageModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  // Fetch data using React Query - uses GET /dashboard/host like web frontend
  const { data: dashboardData, isLoading: loading, error, refetch } = useHostDashboard();
  const notifyStaffMutation = useNotifyStaff();

  const eventId = dashboardData?.lastEvent?.id || dashboardData?.lastEvent?._id;

  const handleEditPress = (step) => {
    if (!eventId) return;
    navigation.navigate("UpdateEventScreen", { eventId, step });
  };

  const handleTestMessagePress = () => {
    setTestMessageModalVisible(true);
  };

  const handleViewStatsPress = () => {
    if (navigation) navigation.navigate("Events");
  };

  const handleSchedulePress = () => {
    setScheduleModalVisible(true);
  };

  const handleNotifyStaff = () => {
    if (!eventId) return;
    notifyStaffMutation.mutate({ eventId }, {
      onSuccess: () => Alert.alert("تم", "تم إرسال الإشعار للفريق"),
      onError: (err) => Alert.alert("خطأ", err.message || "فشل إرسال الإشعار"),
    });
  };

  const handleCreateEvent = () => {
    if (navigation) {
      navigation.navigate("CreateEventScreen");
    }
  };

  const handlePostEventPress = () => {
    if (!eventId) return;
    navigation.navigate("HostPostEvent", { eventId });
  };

  // Check if user has events - matches backend response shape
  const hasEvents = dashboardData?.hasEvents === true;

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
      <Text style={styles.greetingText}>{t("home.welcome") || "مرحبا"}</Text>
      <Text style={styles.organizationName}>
        {user?.name || user?.username || t("home.guest") || "ضيف"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar
          // title="الرئيسية"
          rightContent={topBarActions}
          leftContent={greetingContent}
        />

        {/* Header with gradient background */}
        <View style={styles.header}>
          {/* Texture elements */}
          <View style={styles.textureLeft}>
            <View style={styles.textureLine1} />
            <View style={styles.textureLine2} />
          </View>
          <View style={styles.textureRight}>
            <View style={styles.textureLine1} />
            <View style={styles.textureLine2} />
          </View>

          {/* Last Event or Empty State */}
          <View style={styles.headerContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F9F4EF" />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  {t("common.loadError") || "خطأ في تحميل البيانات"}
                </Text>
                <TouchableOpacity
                  onPress={() => refetch()}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>
                    {t("common.retry") || "إعادة المحاولة"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : hasEvents ? (
              <LastEvent
                event={dashboardData.lastEvent}
                onEditPress={handleEditPress}
                onTestMessagePress={handleTestMessagePress}
                onViewStatsPress={handleViewStatsPress}
                onSchedulePress={handleSchedulePress}
                onNotifyStaffPress={handleNotifyStaff}
                onPostEventPress={handlePostEventPress}
                subscription={dashboardData.subscription}
                isNotifyingStaff={notifyStaffMutation.isPending}
              />
            ) : (
              <MakeYourFirst onCreatePress={handleCreateEvent} />
            )}
          </View>
        </View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Stats Cards */}
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

          {/* Event Templates */}
          <View style={styles.templatesSection}>
            <EventTemplates />
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Create Event FAB */}
        {!loading && hasEvents && (
          <TouchableOpacity
            style={styles.createEventFab}
            onPress={handleCreateEvent}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createEventFabText}>إنشاء مناسبة</Text>
          </TouchableOpacity>
        )}

        {/* Test Message Modal */}
        <TestMessageModal
          visible={testMessageModalVisible}
          onClose={() => setTestMessageModalVisible(false)}
          onSuccess={() => refetch()}
          eventId={eventId}
        />

        {/* Schedule Sending Modal */}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#C28E5C",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9F4EF",
  },
  header: {
    backgroundColor: "#C28E5C",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  textureLeft: {
    position: "absolute",
    left: -190,
    top: -86,
    width: 460,
    height: 436,
    opacity: 0.8,
  },
  textureRight: {
    position: "absolute",
    right: -300,
    top: -86,
    width: 460,
    height: 436,
    opacity: 0.8,
  },
  textureLine1: {
    width: 470,
    height: 50,
    transform: [{ rotate: "129.229deg" }],
    opacity: 0.8,
    background:
      "radial-gradient(8420.27% 85.09% at 8.82% 45.53%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.00) 100%)",
    position: "absolute",
    top: 34,
  },
  textureLine2: {
    width: 495,
    height: 50,
    transform: [{ rotate: "129.229deg" }],
    opacity: 0.8,
    background:
      "radial-gradient(8420.27% 85.09% at 8.82% 45.53%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.00) 100%)",
    position: "absolute",
    left: 116,
    top: 0,
  },
  greetingWrapper: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 4,
  },
  greetingContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  greetingText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#FFF",
    lineHeight: 16,
    textAlign: "right",
  },
  organizationName: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFF",
    lineHeight: 24,
    letterSpacing: 0.08,
    textAlign: "right",
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  statsSection: {
    marginBottom: 16,
  },
  templatesSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 100,
  },
  createEventFab: {
    position: "absolute",
    bottom: 20,
    left: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C28E5C",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  createEventFabText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F4EF",
    borderRadius: 12,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#C28E5C",
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#C28E5C",
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#FFF",
  },
});

export default HomeScreen;
