import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../styles/tokens";

const StatPill = ({ icon, label, value, color }) => (
  <View style={[styles.pill, { backgroundColor: `${color}15` }]}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[styles.value, { color }]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const HostStatsRow = ({ totalEvents, activeEvents, totalGuests }) => (
  <View style={styles.row}>
    <StatPill
      icon="calendar-outline"
      label="Events"
      value={totalEvents ?? 0}
      color={colors.primary[500]}
    />
    <StatPill
      icon="flash-outline"
      label="Active"
      value={activeEvents ?? 0}
      color={colors.warning[500]}
    />
    <StatPill
      icon="people-outline"
      label="Guests"
      value={totalGuests ?? 0}
      color={colors.accent[500]}
    />
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[8] },
  pill: {
    flex: 1,
    borderRadius: borderRadius[12],
    padding: spacing[12],
    alignItems: "center",
    gap: spacing[4],
  },
  value: {
    fontSize: typography.fontSize.headline.small,
    fontWeight: typography.fontWeight.semibold,
  },
  label: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.medium,
  },
});

export default HostStatsRow;
