import React, { useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import EventList from "../../components/events/EventList";
import MakeYourFirst from "../../components/home/MakeYourFirst";
import AdaptiveText from "../../components/commen/AdaptiveText";
import { TopBar } from "../../components/plans";
import { useEventStats, useBusinessCreateEventGate } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";

/**
 * Host events list. Tapping an event pushes the shared `EventDetails`
 * stack route — the same screen the admin navigator uses. The previous
 * inline `currentView === 'details' | 'stats'` machine and the legacy
 * `EventDetails.js` / `SingleEventStats/` components were removed in
 * favour of the unified stack route.
 */
const EventsScreen = ({ navigation }) => {
  const { t } = useTranslation("events");
  const { token } = useAuthStore();
  const toast = useToast();
  // Business accounts with no active subscription cannot create events
  // (subscription-gated server-side). Reflect that in the create-event entry.
  const { blocked: createEventBlocked } = useBusinessCreateEventGate();

  const { data: eventsData, isLoading: loading, error } = useEventStats();

  const handleEventPress = useCallback(
    (event) => {
      const eventId = event._id || event.id;
      navigation.navigate("EventDetails", { eventId });
    },
    [navigation]
  );

  const handleCreateEvent = useCallback(() => {
    // No active subscription (business) → route to the business plans screen
    // for activation instead of opening a wizard that would 403 on submit.
    if (createEventBlocked) {
      toast.info(
        t("createEvent.businessActivationRequired", "فعّل اشتراكك لإنشاء مناسبة")
      );
      navigation.navigate("MainTabs", { screen: "Plans" });
      return;
    }
    navigation.navigate("CreateEventScreen");
  }, [createEventBlocked, navigation, toast, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("title")} showBack={true} onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C28E5C" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t("common.loadError")}</Text>
            {/* Backend error text is arbitrary content — first-strong
                direction + isolation instead of the page locale. */}
            <AdaptiveText style={styles.errorMessage}>
              {error?.message || String(error)}
            </AdaptiveText>
          </View>
        ) : (eventsData?.events?.length ?? 0) === 0 ? (
          <View style={styles.emptyContainer}>
            <MakeYourFirst onCreatePress={handleCreateEvent} />
          </View>
        ) : (
          <EventList
            events={eventsData?.events || []}
            onEventPress={handleEventPress}
            allGuests={eventsData?.allGuests || 0}
            attendanceRate={eventsData?.attendanceRate || 0}
            responseRate={eventsData?.responseRate || 0}
          />
        )}
        <TouchableOpacity
          style={styles.createEventFab}
          onPress={handleCreateEvent}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createEventFabText}>{t("createEvent.title")}</Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#C28E5C",
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
  },
  createEventFab: {
    position: "absolute",
    bottom: 20,
    start: 24,
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
});

export default EventsScreen;
