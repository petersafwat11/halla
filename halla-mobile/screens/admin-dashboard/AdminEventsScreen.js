import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAdminEvents } from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { useTranslation } from "../../localization";
import { canEditPage, PAGES } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import AdminEventList from "../../components/admin-dashboard/events/AdminEventList";
import { backgrounds } from "../../styles/tokens";

const AdminEventsScreen = () => {
  const navigation = useNavigation();
  const toast = useToast();
  const { t } = useTranslation("admin");
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = canEditPage(role, PAGES.EVENTS);

  const { data, isLoading, error, refetch } = useAdminEvents({ page: 1, limit: 50 });

  if (error) toast.error(t("common.error"));

  const events = useMemo(() => {
    const d = data?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.events)) return d.events;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }, [data]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("events.title")} showBack={true} />
        <AdminEventList
          events={events}
          loading={isLoading}
          onRefresh={refetch}
          onEventPress={(ev) => navigation.navigate("EventDetails", { eventId: ev.id || ev._id })}
          onEdit={(ev) => navigation.navigate("UpdateEvent", { eventId: ev.id || ev._id })}
          onAdd={canEdit ? () => navigation.navigate("CreateEvent") : undefined}
          addLabel={t("dashboard.actions.createEvent")}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminEventsScreen;
