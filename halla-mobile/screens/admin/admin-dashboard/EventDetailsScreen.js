import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAdminEventById,
  useUpdateAdminEventStatus,
  useDeleteAdminEvent,
} from "../../../hooks";
import { useAuthStore } from "../../../stores/authStore";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "../../../localization";
import { canEditPage, canDeleteOnPage, PAGES } from "../../../utils/adminPermissions";
import TopBar from "../../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../../components/admin-dashboard/hosts/HostSectionCard";
import EventActionsHeader from "../../../components/home/EventActionsHeader";
import { EventStatPill, GuestListSection, EventActionsSection, EventHeroCard } from "../../../components/admin-dashboard/events";
import { colors, spacing, textStyles, backgrounds } from "../../../styles/tokens";

const STATUS_CONFIG = {
  scheduled: { color: "#3498DB", bg: "#E8F4FD", labelKey: "scheduled" },
  live: { color: "#2A8C5B", bg: "#EAF4EF", labelKey: "live" },
  completed: { color: "#666666", bg: "#F5F5F5", labelKey: "completed" },
  draft: { color: "#D38200", bg: "#FBF3E6", labelKey: "draft" },
  cancelled: { color: "#C0392B", bg: "#F9EBEA", labelKey: "cancelled" },
};

const EventDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const { t } = useTranslation("admin");
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);

  const { data: resp, isLoading, error, refetch } = useAdminEventById(eventId);
  const updateStatus = useUpdateAdminEventStatus();
  const deleteEvent = useDeleteAdminEvent();

  if (error) toast.error(t("eventDetails.loadFailed"));

  const event = useMemo(() => resp?.data?.event || resp?.data || null, [resp]);

  const statusCfg = STATUS_CONFIG[event?.status] || { color: "#666666", bg: "#F5F5F5", labelKey: "unknown" };
  const statusLabel = t(`eventDetails.statuses.${statusCfg.labelKey}`, statusCfg.labelKey);

  const handleStatusChange = (newStatus, titleKey, messageKey, btnLabelKey, destructive = false) => {
    Alert.alert(t(titleKey), t(messageKey), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t(btnLabelKey),
        style: destructive ? "destructive" : "default",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ eventId: event.id || event._id, status: newStatus });
            const actionLabel = t(`eventDetails.${btnLabelKey.replace("publish", "published").replace("end", "ended").replace("cancel", "cancelled").replace("reschedule", "rescheduled")}`);
            toast.success(actionLabel);
            refetch();
          } catch {
            toast.error(t("eventDetails.updateStatusFailed"));
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(t("eventDetails.deleteConfirmTitle"), t("eventDetails.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent.mutateAsync(event.id || event._id);
            toast.success(t("eventDetails.deleted"));
            navigation.goBack();
          } catch {
            toast.error(t("eventDetails.deleteFailed"));
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title")} showBack={true} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.centerText}>{t("eventDetails.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title={t("eventDetails.title")} showBack={true} />
        <View style={styles.centerState}>
          <Ionicons name="calendar-outline" size={48} color={colors.natural[400]} />
          <Text style={styles.centerText}>{t("eventDetails.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hostName = event.host?.name || event.host?.username || event.hostName || "—";
  const hostEmail = event.host?.email || event.hostEmail || null;
  const locationStr = [event.location?.address, event.location?.city].filter(Boolean).join(", ");
  const guestList = event.guestList || [];
  const totalGuests = guestList.length;
  const confirmedGuests = guestList.filter((g) => g.status === "confirmed").length;
  const pendingGuests = guestList.filter((g) => g.status === "invited" || g.status === "pending").length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title={t("eventDetails.title")} showBack={true} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        <EventHeroCard event={event} statusCfg={statusCfg} statusLabel={statusLabel} t={t} />

        <View style={styles.pillsRow}>
          <EventStatPill icon="people-outline" label={t("eventDetails.total")} value={totalGuests} color={colors.primary[500]} />
          <EventStatPill icon="checkmark-circle-outline" label={t("eventDetails.confirmed")} value={confirmedGuests} color={colors.success[500]} />
          <EventStatPill icon="time-outline" label={t("eventDetails.pending")} value={pendingGuests} color={colors.warning[500]} />
        </View>

        <SectionCard title={t("eventDetails.eventDetails")} icon="calendar-outline">
          <InfoRow icon="calendar-outline" label={t("eventDetails.date")} value={new Date(event.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} />
          {event.time && <InfoRow icon="time-outline" label={t("eventDetails.time")} value={event.time} />}
          {locationStr && <InfoRow icon="location-outline" label={t("eventDetails.location")} value={locationStr} />}
          {event.category ? (
            <InfoRow icon="pricetag-outline" label={t("eventDetails.category")} value={event.category} last />
          ) : (
            <InfoRow icon="document-text-outline" label={t("eventDetails.created")} value={new Date(event.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} last />
          )}
        </SectionCard>

        <SectionCard title={t("eventDetails.host")} icon="person-outline">
          <InfoRow icon="person-outline" label={t("eventDetails.name")} value={hostName} last={!hostEmail} />
          {hostEmail && <InfoRow icon="mail-outline" label={t("eventDetails.email")} value={hostEmail} last />}
        </SectionCard>

        <EventActionsSection
          event={event}
          canEdit={canEdit}
          canDelete={canDelete}
          updatePending={updateStatus.isPending}
          deletePending={deleteEvent.isPending}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          t={t}
          SectionCard={SectionCard}
        />

        <View style={{ paddingHorizontal: spacing[4] }}>
          <EventActionsHeader
            event={{ id: event.id || event._id, testMessageSent: event.testMessageSent, whatsappTemplateStatus: event.whatsappTemplateStatus, launchSettings: event.launchSettings, staffCount: event.staffList?.length || 0 }}
            isAdmin={true}
          />
        </View>

        <GuestListSection guestList={guestList} t={t} SectionCard={SectionCard} />

        <View style={{ height: spacing[32] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  scroll: { flex: 1, backgroundColor: backgrounds.artboard },
  content: { padding: spacing[16], gap: spacing[12] },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[12] },
  centerText: { ...textStyles.bodyMedium, color: colors.natural[450] },
  pillsRow: { flexDirection: "row", gap: spacing[8] },
});

export default EventDetailsScreen;
