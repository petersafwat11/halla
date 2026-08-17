import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const RSVP_CONFIG = {
  confirmed: { color: "#2A8C5B", bg: "#EAF4EF", label: "Confirmed" },
  pending:   { color: "#D38200", bg: "#FBF3E6", label: "Pending" },
  declined:  { color: "#C0392B", bg: "#F9EBEA", label: "Declined" },
};

const FILTERS = [
  { id: "all",       label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending",   label: "Pending" },
  { id: "declined",  label: "Declined" },
];

const GuestList = ({ guests = [], onRefresh, loading }) => {
  const { t } = useTranslation("events");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = useMemo(() => {
    if (activeFilter === "all") return guests;
    return guests.filter((g) => g.rsvpStatus?.toLowerCase() === activeFilter);
  }, [guests, activeFilter]);

  const renderItem = ({ item }) => {
    const rsvpKey = item.rsvpStatus?.toLowerCase();
    const rsvpCfg = RSVP_CONFIG[rsvpKey] || { color: "#666", bg: "#F5F5F5", label: item.rsvpStatus || "—" };

    // Read straight from the embedded invitation sub-doc that
    // `getEventGuests` returns (see guests.service._formatGuest). When
    // the data comes from `getEventById` we still get the same shape.
    const inv = item.invitation || {};
    const autoSent = inv.autoReminderSent;

    return (
      <View style={styles.guestRow}>
        <View style={styles.guestInfo}>
          <Text style={styles.guestName} numberOfLines={1}>
            {item.name || item.user?.name || "Unknown"}
          </Text>
          {(item.email || item.user?.email) ? (
            <Text style={styles.guestEmail} numberOfLines={1}>
              {item.email || item.user?.email}
            </Text>
          ) : null}
          {autoSent ? (
            <View style={styles.reminderBadgesRow}>
              <View style={[styles.reminderBadge, styles.reminderBadgeSent]}>
                <Ionicons name="time-outline" size={10} color="#2A8C5B" />
                <Text style={styles.reminderBadgeText}>
                  {t("guestTableExtras.autoReminder", "Auto reminder")} ·{" "}
                  {t("guestTableExtras.sent", "Sent")}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
        <View style={styles.guestRight}>
          <View style={[styles.rsvpChip, { backgroundColor: rsvpCfg.bg }]}>
            <Text style={[styles.rsvpText, { color: rsvpCfg.color }]}>{rsvpCfg.label}</Text>
          </View>
          {item.checkedIn && (
            <View style={styles.checkedInDot} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Guest List</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{guests.length}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.id;
          const count =
            f.id === "all"
              ? guests.length
              : guests.filter((g) => g.rsvpStatus?.toLowerCase() === f.id).length;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => (item.id || item._id)?.toString() || index.toString()}
        renderItem={renderItem}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!loading}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
            />
          ) : null
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={40} color={colors.natural[300]} />
            <Text style={styles.emptyText}>No guests found</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  sectionTitle: {
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

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  filterChip: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
    backgroundColor: backgrounds.card[2],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.natural[600],
  },
  filterChipTextActive: { color: "#fff" },

  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: backgrounds.card[1],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
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

  separator: {
    height: 1,
    backgroundColor: colors.natural[100],
    marginHorizontal: spacing[16],
  },

  emptyWrap: {
    paddingVertical: spacing[40],
    alignItems: "center",
    gap: spacing[8],
  },
  emptyText: { ...textStyles.bodyMedium, color: colors.natural[400] },

  reminderBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[4],
    marginTop: spacing[4],
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: borderRadius[20],
  },
  reminderBadgeSent: { backgroundColor: "#EAF4EF" },
  reminderBadgeText: { fontSize: 10, fontWeight: "600", color: "#2A8C5B" },
});

export default GuestList;
