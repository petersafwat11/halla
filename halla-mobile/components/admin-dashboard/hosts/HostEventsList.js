import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusColor = (status) => {
  switch (status) {
    case "published": return colors.success[500];
    case "pending_scheduling": return colors.natural[450];
    case "ended":     return colors.error[500];
    default:          return colors.natural[400];
  }
};

const EventCard = ({ event, onPress }) => {
  const statusColor = getStatusColor(event.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.strip, { backgroundColor: statusColor }]} />
      <View style={styles.cardContent}>
        {/* Title + status chip */}
        <View style={styles.topRow}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {event.title || "Untitled Event"}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {(event.status || "pending_scheduling").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </View>
        </View>

        {/* Date */}
        {event.date && (
          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={12} color={colors.natural[450]} />
            <Text style={styles.metaText}>
              {formatDate(event.date)}{event.time ? `  •  ${event.time}` : ""}
            </Text>
          </View>
        )}

        {/* Location */}
        {event.location?.address && (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={12} color={colors.natural[450]} />
            <Text style={styles.metaText} numberOfLines={1}>
              {[event.location.address, event.location.city].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={12} color={colors.primary[500]} />
            <Text style={styles.statText}>{event.guestListLength ?? 0} Guests</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.success[500]} />
            <Text style={[styles.statText, { color: colors.success[500] }]}>
              {event.totalConfirmed ?? 0} Confirmed
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="close-circle-outline" size={12} color={colors.error[500]} />
            <Text style={[styles.statText, { color: colors.error[500] }]}>
              {event.totalDeclined ?? 0} Declined
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HostEventsList = ({ events = [], onEventPress }) => (
  <View style={styles.section}>
    {/* Section header */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Events</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{events.length}</Text>
      </View>
    </View>

    {/* Empty state */}
    {events.length === 0 ? (
      <View style={styles.empty}>
        <Ionicons name="calendar-outline" size={36} color={colors.natural[300]} />
        <Text style={styles.emptyText}>No events yet</Text>
      </View>
    ) : (
      events.map((ev) => (
        <EventCard
          key={ev.id || ev._id}
          event={ev}
          onPress={() => onEventPress?.(ev)}
        />
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  section: { gap: spacing[8] },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
  },
  headerTitle: {
    ...textStyles.titleSmall,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
  },
  countBadge: {
    backgroundColor: `${colors.primary[500]}15`,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: borderRadius[20],
  },
  countText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },

  // Event card
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  strip: { width: 4 },
  cardContent: { flex: 1, padding: spacing[12], gap: spacing[4] },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing[8],
  },
  eventTitle: {
    ...textStyles.bodyMedium,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: borderRadius[20],
  },
  statusText: { fontSize: 11, fontWeight: typography.fontWeight.semibold },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  metaText: {
    fontSize: typography.fontSize.caption.large,
    color: colors.natural[450],
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing[12],
    paddingTop: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.natural[150],
    marginTop: spacing[4],
  },
  stat: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  statText: {
    fontSize: typography.fontSize.caption.large,
    color: colors.natural[500],
    fontWeight: typography.fontWeight.medium,
  },

  // Empty
  empty: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[32],
    alignItems: "center",
    gap: spacing[8],
  },
  emptyText: {
    ...textStyles.bodyMedium,
    color: colors.natural[400],
  },
});

export default HostEventsList;
