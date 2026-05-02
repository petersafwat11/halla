import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../stores/authStore";
import { useUpdateAdminEvent } from "../../hooks";
import adminDashboardService from "../../services/adminDashboardService";
import TopBar from "../../components/plans/TopBar";
import { UpdateEventForm } from "../../components/admin-dashboard/events";
import { backgrounds, colors } from "../../styles/tokens";

const UpdateEventScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation("admin");
  const toast = useToast();
  const token = useAuthStore((state) => state.token);

  const eventId = route.params?.eventId;
  const [eventData, setEventData] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const updateEvent = useUpdateAdminEvent();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoadingEvent(true);
        const res = await adminDashboardService.events.getById(token, eventId);
        if (res.success && res.data) {
          setEventData(res.data?.data || res.data);
        } else {
          setLoadError(t("events.update.loadError"));
        }
      } catch {
        setLoadError(t("events.update.loadError"));
      } finally {
        setLoadingEvent(false);
      }
    };

    if (eventId) {
      fetchEvent();
    } else {
      setLoadingEvent(false);
      setLoadError("No event ID provided");
    }
  }, [eventId, token]);

  const handleSubmit = async (formData) => {
    try {
      await updateEvent.mutateAsync({ eventId, eventData: formData });
      toast.success(t("events.updateSuccess") || "Event updated successfully");
      navigation.goBack();
    } catch {
      toast.error(t("events.updateError") || "Failed to update event");
    }
  };

  if (loadingEvent) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("events.update.title")} showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("events.update.title")} showBack={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("events.update.title")} showBack={true} />
        <UpdateEventForm
          initialData={eventData}
          onSubmit={handleSubmit}
          loading={updateEvent.isPending}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: backgrounds.artboard,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Cairo_400Regular",
    color: "#e74c3c",
    textAlign: "center",
    padding: 16,
  },
});

export default UpdateEventScreen;