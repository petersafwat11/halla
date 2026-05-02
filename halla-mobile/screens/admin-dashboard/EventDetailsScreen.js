import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
} from "../../hooks";
import { useAuthStore } from "../../stores/authStore";
import { useToast } from "../../contexts/ToastContext";
import { canEditPage, canDeleteOnPage, PAGES } from "../../utils/adminPermissions";
import TopBar from "../../components/plans/TopBar";
import { SectionCard, InfoRow } from "../../components/admin-dashboard/hosts/HostSectionCard";
import EventActionsHeader from "../../components/home/EventActionsHeader";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../styles/tokens";

const STATUS_CONFIG = {
  scheduled: { color: "#3498DB", bg: "#E8F4FD", label: "Scheduled" },
  live:       { color: "#2A8C5B", bg: "#EAF4EF", label: "Live" },
  completed:  { color: "#666666", bg: "#F5F5F5", label: "Completed" },
  draft:      { color: "#D38200", bg: "#FBF3E6", label: "Draft" },
  cancelled:  { color: "#C0392B", bg: "#F9EBEA", label: "Cancelled" },
};

const RSVP_CONFIG = {
  confirmed: { color: "#2A8C5B", bg: "#EAF4EF", label: "Confirmed" },
  pending:   { color: "#D38200", bg: "#FBF3E6", label: "Pending" },
  declined:  { color: "#C0392B", bg: "#F9EBEA", label: "Declined" },
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const StatPill = ({ icon, label, value, color }) => (
  <View style={[styles.pill, { borderTopColor: color }]}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.pillValue, { color }]}>{value}</Text>
    <Text style={styles.pillLabel}>{label}</Text>
  </View>
);

const ActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last, destructive }) => (
  <TouchableOpacity
    style={[styles.actionRow, !last && styles.actionRowBorder]}
    onPress={onPress}
    disabled={loading}
  >
    <View style={styles.actionRowLeft}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        {loading
          ? <ActivityIndicator size="small" color={iconColor} />
          : <Ionicons name={icon} size={18} color={iconColor} />
        }
      </View>
      <View>
        <Text style={[styles.actionLabel, destructive && { color: colors.error[500] }]}>
          {label}
        </Text>
        {sublabel ? <Text style={styles.actionSub}>{sublabel}</Text> : null}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.natural[300]} />
  </TouchableOpacity>
);

const EventDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canEditPage(role, PAGES.EVENTS);
  const canDelete = canDeleteOnPage(role, PAGES.EVENTS);

  const { data: resp, isLoading, error, refetch } = useAdminEventById(eventId);
  const updateStatus = useUpdateAdminEventStatus();
  const deleteEvent = useDeleteAdminEvent();

  if (error) toast.error("Failed to load event");

  const event = useMemo(() => resp?.data?.event || resp?.data || null, [resp]);

  const statusCfg = STATUS_CONFIG[event?.status] || { color: "#666666", bg: "#F5F5F5", label: event?.status || "Unknown" };

  const handleStatusChange = (newStatus, title, message, btnLabel, destructive = false) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: btnLabel,
        style: destructive ? "destructive" : "default",
        onPress: async () => {
          try {
            await updateStatus.mutateAsync({ eventId: event.id || event._id, status: newStatus });
            toast.success(`Event ${btnLabel.toLowerCase()}d`);
            refetch();
          } catch {
            toast.error("Failed to update event status");
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Event",
      "This cannot be undone. Permanently delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent.mutateAsync(event.id || event._id);
              toast.success("Event deleted");
              navigation.goBack();
            } catch {
              toast.error("Failed to delete event");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title="Event Details" showBack={true} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.centerText}>Loading event…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TopBar title="Event Details" showBack={true} />
        <View style={styles.centerState}>
          <Ionicons name="calendar-outline" size={48} color={colors.natural[400]} />
          <Text style={styles.centerText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hostName = event.host?.name || event.host?.username || event.hostName || "—";
  const hostEmail = event.host?.email || event.hostEmail || null;
  const locationStr = [event.location?.address, event.location?.city].filter(Boolean).join(", ");
  const totalGuests = event.guestListLength ?? event.totalGuests ?? 0;
  const confirmedGuests = event.confirmedGuests ?? 0;
  const pendingGuests = event.pendingGuests ?? 0;
  const guests = event.guests || [];

  const status = event.status;
  const updatePending = updateStatus.isPending;
  const deletePending = deleteEvent.isPending;

  const actionRows = [];
  if (canEdit) {
    if (status === "draft") {
      actionRows.push(
        <ActionRow
          key="publish"
          icon="megaphone-outline"
          iconBg="#EAF4EF"
          iconColor="#2A8C5B"
          label="Publish Event"
          sublabel="Make this event scheduled and visible"
          loading={updatePending}
          onPress={() =>
            handleStatusChange("scheduled", "Publish Event", "Publish this event?", "Publish")
          }
        />
      );
    }
    if (status === "scheduled" || status === "live") {
      actionRows.push(
        <ActionRow
          key="end"
          icon="stop-circle-outline"
          iconBg="#FBF3E6"
          iconColor="#D38200"
          label="End Event"
          sublabel="Mark this event as completed"
          loading={updatePending}
          onPress={() =>
            handleStatusChange("completed", "End Event", "Mark this event as completed?", "End")
          }
        />
      );
    }
    if (status !== "cancelled") {
      actionRows.push(
        <ActionRow
          key="cancel"
          icon="close-circle-outline"
          iconBg="#F9EBEA"
          iconColor="#C0392B"
          label="Cancel Event"
          sublabel="Cancel and notify guests"
          loading={updatePending}
          destructive
          onPress={() =>
            handleStatusChange("cancelled", "Cancel Event", "Cancel this event? Guests will be notified.", "Cancel", true)
          }
        />
      );
    }
    if (status === "cancelled" || status === "completed") {
      actionRows.push(
        <ActionRow
          key="reschedule"
          icon="refresh-outline"
          iconBg="#E8F4FD"
          iconColor="#3498DB"
          label="Reschedule Event"
          sublabel="Move back to scheduled status"
          loading={updatePending}
          onPress={() =>
            handleStatusChange("scheduled", "Reschedule Event", "Move this event back to scheduled?", "Reschedule")
          }
        />
      );
    }
  }
  if (canDelete) {
    actionRows.push(
      <ActionRow
        key="delete"
        icon="trash-outline"
        iconBg="#F9EBEA"
        iconColor="#C0392B"
        label="Delete Event"
        sublabel="Permanently remove this event"
        loading={deletePending}
        destructive
        last
        onPress={handleDelete}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar title="Event Details" showBack={true} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary[500]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { borderLeftColor: statusCfg.color }]}>
          <View style={styles.heroBody}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {event.title || "Untitled Event"}
              </Text>
              <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                <Text style={[styles.statusChipText, { color: statusCfg.color }]}>
                  {statusCfg.label}
                </Text>
              </View>
            </View>
            <View style={styles.heroMeta}>
              <Ionicons name="person-outline" size={13} color={colors.natural[450]} />
              <Text style={styles.heroMetaText}>{hostName}</Text>
            </View>
            {event.date && (
              <View style={styles.heroMeta}>
                <Ionicons name="calendar-outline" size={13} color={colors.natural[450]} />
                <Text style={styles.heroMetaText}>
                  {formatDate(event.date)}{event.time ? `  •  ${event.time}` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.pillsRow}>
          <StatPill
            icon="people-outline"
            label="Total"
            value={totalGuests}
            color={colors.primary[500]}
          />
          <StatPill
            icon="checkmark-circle-outline"
            label="Confirmed"
            value={confirmedGuests}
            color={colors.success[500]}
          />
          <StatPill
            icon="time-outline"
            label="Pending"
            value={pendingGuests}
            color={colors.warning[500]}
          />
        </View>

        {/* Event Details */}
        <SectionCard title="Event Details" icon="calendar-outline">
          <InfoRow icon="calendar-outline" label="Date" value={formatDate(event.date)} />
          {event.time && (
            <InfoRow icon="time-outline" label="Time" value={event.time} />
          )}
          {locationStr ? (
            <InfoRow icon="location-outline" label="Location" value={locationStr} />
          ) : null}
          {event.category && (
            <InfoRow icon="pricetag-outline" label="Category" value={event.category} last />
          )}
          {!event.category && (
            <InfoRow icon="document-text-outline" label="Created" value={formatDate(event.createdAt)} last />
          )}
        </SectionCard>

        {/* Host */}
        <SectionCard title="Host" icon="person-outline">
          <InfoRow icon="person-outline" label="Name" value={hostName} last={!hostEmail} />
          {hostEmail && (
            <InfoRow icon="mail-outline" label="Email" value={hostEmail} last />
          )}
        </SectionCard>

        {/* Admin Actions */}
        {(canEdit || canDelete) && actionRows.length > 0 && (
          <SectionCard title="Admin Actions" icon="shield-outline">
            {actionRows.map((row, idx) =>
              React.cloneElement(row, {
                last: idx === actionRows.length - 1,
              })
            )}
          </SectionCard>
        )}

        {/* Event Actions Header */}
        <View style={{ paddingHorizontal: spacing[4] }}>
          <EventActionsHeader
            event={{
              id: event.id || event._id,
              testMessageSent: event.testMessageSent,
              whatsappTemplateStatus: event.whatsappTemplateStatus,
              launchSettings: event.launchSettings,
              staffCount: event.staffList?.length || 0,
            }}
            isAdmin={true}
          />
        </View>

        {/* Guest List */}
        <SectionCard title="Guest List" icon="people-outline">
          <View style={styles.guestHeader}>
            <View style={[styles.guestCountBadge, { backgroundColor: `${colors.primary[500]}15` }]}>
              <Text style={styles.guestCountText}>{guests.length}</Text>
            </View>
          </View>
          {guests.length === 0 ? (
            <View style={styles.guestEmpty}>
              <Ionicons name="people-outline" size={32} color={colors.natural[300]} />
              <Text style={styles.guestEmptyText}>No guests yet</Text>
            </View>
          ) : (
            guests.map((g, idx) => {
              const rsvpKey = g.rsvpStatus?.toLowerCase();
              const rsvpCfg = RSVP_CONFIG[rsvpKey] || { color: "#666", bg: "#F5F5F5", label: g.rsvpStatus || "—" };
              return (
                <View
                  key={g.id || g._id || idx}
                  style={[
                    styles.guestRow,
                    idx < guests.length - 1 && styles.guestRowBorder,
                  ]}
                >
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestName} numberOfLines={1}>
                      {g.name || g.user?.name || "Unknown"}
                    </Text>
                    {(g.email || g.user?.email) ? (
                      <Text style={styles.guestEmail} numberOfLines={1}>
                        {g.email || g.user?.email}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.guestRight}>
                    <View style={[styles.rsvpChip, { backgroundColor: rsvpCfg.bg }]}>
                      <Text style={[styles.rsvpText, { color: rsvpCfg.color }]}>
                        {rsvpCfg.label}
                      </Text>
                    </View>
                    {g.checkedIn && (
                      <View style={styles.checkedInDot} />
                    )}
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>

        <View style={{ height: spacing[32] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  scroll: { flex: 1, backgroundColor: backgrounds.artboard },
  content: { padding: spacing[16], gap: spacing[12] },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
  },
  centerText: { ...textStyles.bodyMedium, color: colors.natural[450] },

  // Hero
  heroCard: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heroBody: { padding: spacing[16], gap: spacing[8] },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[8],
  },
  heroTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
    flexShrink: 0,
  },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  heroMetaText: { ...textStyles.bodySmall, color: colors.natural[500] },

  // Stat pills row
  pillsRow: {
    flexDirection: "row",
    gap: spacing[8],
  },
  pill: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[12],
    alignItems: "center",
    borderTopWidth: 3,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing[4],
  },
  pillLabel: {
    fontSize: 11,
    color: colors.natural[450],
    marginTop: spacing[4],
  },

  // Action rows
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    fontWeight: "600",
  },
  actionSub: { fontSize: 11, color: colors.natural[400], marginTop: 1 },

  // Guest list
  guestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  guestCountBadge: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: borderRadius[20],
  },
  guestCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary[500],
  },
  guestEmpty: {
    padding: spacing[32],
    alignItems: "center",
    gap: spacing[8],
  },
  guestEmptyText: { ...textStyles.bodySmall, color: colors.natural[400] },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  guestRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  guestInfo: { flex: 1 },
  guestName: {
    ...textStyles.bodyMedium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  guestEmail: {
    ...textStyles.bodySmall,
    color: colors.natural[450],
    marginTop: 2,
  },
  guestRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  rsvpChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
  },
  rsvpText: { fontSize: 11, fontWeight: "600" },
  checkedInDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success[500],
  },
});

export default EventDetailsScreen;
