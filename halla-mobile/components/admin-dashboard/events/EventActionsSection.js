import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EventActionRow } from "../../admin-dashboard/events";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../styles/tokens";

const EventActionsSection = ({ event, canEdit, canDelete, updatePending, deletePending, onStatusChange, onDelete, t, SectionCard }) => {
  const status = event.status;
  const actionRows = [];

  if (canEdit) {
    if (status === "draft") {
      actionRows.push(
        <EventActionRow
          key="publish"
          icon="megaphone-outline"
          iconBg="#EAF4EF"
          iconColor="#2A8C5B"
          label={t("eventDetails.publishEvent")}
          sublabel={t("eventDetails.publishEventSublabel")}
          loading={updatePending}
          onPress={() => onStatusChange("scheduled", "eventDetails.publishConfirmTitle", "eventDetails.publishConfirmMessage", "eventDetails.publish")}
        />
      );
    }
    if (status === "scheduled" || status === "live") {
      actionRows.push(
        <EventActionRow
          key="end"
          icon="stop-circle-outline"
          iconBg="#FBF3E6"
          iconColor="#D38200"
          label={t("eventDetails.endEvent")}
          sublabel={t("eventDetails.endEventSublabel")}
          loading={updatePending}
          onPress={() => onStatusChange("completed", "eventDetails.endConfirmTitle", "eventDetails.endConfirmMessage", "eventDetails.end")}
        />
      );
    }
    if (status !== "cancelled") {
      actionRows.push(
        <EventActionRow
          key="cancel"
          icon="close-circle-outline"
          iconBg="#F9EBEA"
          iconColor="#C0392B"
          label={t("eventDetails.cancelEvent")}
          sublabel={t("eventDetails.cancelEventSublabel")}
          loading={updatePending}
          destructive
          onPress={() => onStatusChange("cancelled", "eventDetails.cancelConfirmTitle", "eventDetails.cancelConfirmMessage", "eventDetails.cancelEvent", true)}
        />
      );
    }
    if (status === "cancelled" || status === "completed") {
      actionRows.push(
        <EventActionRow
          key="reschedule"
          icon="refresh-outline"
          iconBg="#E8F4FD"
          iconColor="#3498DB"
          label={t("eventDetails.rescheduleEvent")}
          sublabel={t("eventDetails.rescheduleEventSublabel")}
          loading={updatePending}
          onPress={() => onStatusChange("scheduled", "eventDetails.rescheduleConfirmTitle", "eventDetails.rescheduleConfirmMessage", "eventDetails.reschedule")}
        />
      );
    }
  }
  if (canDelete) {
    actionRows.push(
      <EventActionRow
        key="delete"
        icon="trash-outline"
        iconBg="#F9EBEA"
        iconColor="#C0392B"
        label={t("eventDetails.deleteEvent")}
        sublabel={t("eventDetails.deleteEventSublabel")}
        loading={deletePending}
        destructive
        last
        onPress={onDelete}
      />
    );
  }

  if (actionRows.length === 0) return null;

  return (
    <SectionCard title={t("eventDetails.adminActions")} icon="shield-outline">
      {actionRows.map((row, idx) =>
        React.cloneElement(row, { last: idx === actionRows.length - 1 })
      )}
    </SectionCard>
  );
};

const EventHeroCard = ({ event, statusCfg, statusLabel, t }) => {
  const hostName = event.host?.name || event.host?.username || event.hostName || "—";

  return (
    <View style={[styles.heroCard, { borderLeftColor: statusCfg.color }]}>
      <View style={styles.heroBody}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {event.title || t("eventDetails.untitledEvent")}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusChipText, { color: statusCfg.color }]}>{statusLabel}</Text>
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
              {new Date(event.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              {event.time ? `  •  ${event.time}` : ""}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing[8] },
  heroTitle: { ...textStyles.titleMedium, color: colors.natural[900], fontWeight: typography.fontWeight.semibold, flex: 1 },
  statusChip: { paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: borderRadius[20], flexShrink: 0 },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  heroMetaText: { ...textStyles.bodySmall, color: colors.natural[500] },
});

export { EventActionsSection, EventHeroCard };
