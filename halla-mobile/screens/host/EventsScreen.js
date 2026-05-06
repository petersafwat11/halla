import React, { useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import EventList from "../../components/events/EventList";
import EventDetails from "../../components/events/EventDetails";
import SingleEventStats from "../../components/events/SingleEventStats";
import { TopBar } from "../../components/plans";
import { useEventStats, useSingleEventStats } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useLanguage } from "../../localization/providers/LanguageProvider";

const EventsScreen = ({ navigation }) => {
  const { t } = useTranslation("events");
  const { token } = useAuthStore();
  const { isRTL } = useLanguage();
  const directionStyle = { direction: isRTL ? "rtl" : "ltr" };
  const [currentView, setCurrentView] = useState("list");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: eventsData, isLoading: loading, error, refetch } = useEventStats();

  const selectedEventId = selectedEvent?._id || selectedEvent?.id;

  const {
    data: eventStats,
    isLoading: statsLoading,
    error: statsError
  } = useSingleEventStats(selectedEventId, { eventStatus: selectedEvent?.status });

  const handleEventPress = useCallback((event) => {
    setSelectedEvent(event);
    setCurrentView("details");
  }, []);

  const handleStatsPress = useCallback(() => {
    setCurrentView("stats");
  }, []);

  const handleBackToList = useCallback(() => {
    setCurrentView("list");
    setSelectedEvent(null);
  }, []);

  const handleBackToDetails = useCallback(() => {
    setCurrentView("details");
  }, []);

  const handleBack = useCallback(() => {
    if (currentView === "stats") {
      setCurrentView("details");
    } else if (currentView === "details") {
      setCurrentView("list");
      setSelectedEvent(null);
    } else {
      navigation.goBack();
    }
  }, [currentView, navigation]);

  const getTitle = useCallback(() => {
    switch (currentView) {
      case "list":
        return t("title");
      case "details":
      case "stats":
        return t("eventDetails.title");
      default:
        return t("title");
    }
  }, [currentView, t]);

  const renderContent = useCallback(() => {
    if (loading && currentView === "list") {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C28E5C" />
        </View>
      );
    }

    if (error && currentView === "list") {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t("common.loadError")}</Text>
          <Text style={styles.errorMessage}>{error?.message || String(error)}</Text>
        </View>
      );
    }

    switch (currentView) {
      case "list":
        return (
          <EventList
            events={eventsData?.events || []}
            onEventPress={handleEventPress}
            allGuests={eventsData?.allGuests || 0}
            attendanceRate={eventsData?.attendanceRate || 0}
            responseRate={eventsData?.responseRate || 0}
          />
        );
      case "details":
        return (
          <EventDetails
            event={selectedEvent}
            onStatsPress={handleStatsPress}
            onBack={handleBackToList}
          />
        );
      case "stats":
        if (statsLoading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C28E5C" />
            </View>
          );
        }
        if (statsError) {
          return (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{t("common.loadError")}</Text>
              <Text style={styles.errorMessage}>{statsError?.message || String(statsError)}</Text>
            </View>
          );
        }
        return (
          <SingleEventStats
            event={selectedEvent}
            stats={eventStats}
            onBack={handleBackToDetails}
            onRefresh={() => {}}
          />
        );
      default:
        return null;
    }
  }, [loading, error, currentView, eventsData, selectedEvent, statsLoading, statsError, eventStats, handleEventPress, handleStatsPress, handleBackToList, handleBackToDetails, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={getTitle()} showBack={true} onBack={handleBack} />
      <View style={[styles.container, directionStyle]}>
        {renderContent()}
        {currentView === "list" && (
          <TouchableOpacity
            style={styles.createEventFab}
            onPress={() => navigation.navigate("CreateEventScreen")}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createEventFabText}>{t("createEvent.title")}</Text>
          </TouchableOpacity>
        )}
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
  content: {
    flex: 1,
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
});

export default EventsScreen;
