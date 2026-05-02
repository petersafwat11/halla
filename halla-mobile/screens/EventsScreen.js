import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import EventList from "../components/events/EventList";
import EventDetails from "../components/events/EventDetails";
import SingleEventStats from "../components/events/SingleEventStats";
import { TopBar } from "../components/plans";
import { useEventStats, useSingleEventStats } from "../hooks";
import { useAuthStore } from "../stores/authStore";
import { useLanguage } from "../localization/providers/LanguageProvider";

const EventsScreen = ({ navigation }) => {
  const { token } = useAuthStore();
  const { isRTL } = useLanguage();
  const directionStyle = { direction: isRTL ? "rtl" : "ltr" };
  const [currentView, setCurrentView] = useState("list"); // list, details, stats
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch events data using React Query
  const { data: eventsData, isLoading: loading, error, refetch } = useEventStats();

  // Fetch single event stats only when needed
  // Backend _formatEvent returns "id", raw MongoDB docs use "_id" — handle both
  const selectedEventId = selectedEvent?._id || selectedEvent?.id;

  const {
    data: eventStats,
    isLoading: statsLoading,
    error: statsError
  } = useSingleEventStats(selectedEventId, selectedEvent?.status);

  const handleEventPress = (event) => {
    // EventDetails uses data from getEventStats (already loaded)
    // No need to fetch again, just set the selected event
    setSelectedEvent(event);
    setCurrentView("details");
  };

  const handleStatsPress = () => {
    // Stats will be fetched automatically by useSingleEventStats hook
    setCurrentView("stats");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedEvent(null);
  };

  const handleBackToDetails = () => {
    setCurrentView("details");
  };

  const handleBack = () => {
    if (currentView === "stats") {
      setCurrentView("details");
    } else if (currentView === "details") {
      setCurrentView("list");
      setSelectedEvent(null);
    } else {
      navigation.goBack();
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case "list":
        return "المناسبات";
      case "details":
        return "تفاصيل المناسبة";
      case "stats":
        return "تفاصيل المناسبة";
      default:
        return "المناسبات";
    }
  };

  const renderContent = () => {
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
          <Text style={styles.errorText}>خطأ في تحميل البيانات</Text>
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
              <Text style={styles.errorText}>خطأ في تحميل الإحصائيات</Text>
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
  };

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
            <Text style={styles.createEventFabText}>إنشاء مناسبة</Text>
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
