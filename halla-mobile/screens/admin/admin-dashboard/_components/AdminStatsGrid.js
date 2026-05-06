import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const ICON_MAP = {
  users: { name: "people-outline", color: colors.primary[500] },
  store: { name: "storefront-outline", color: "#C28E5C" },
  calendar: { name: "calendar-outline", color: "#3498DB" },
  "credit-card": { name: "card-outline", color: "#9B59B6" },
  ticket: { name: "ticket-outline", color: colors.warning[500] },
};

const StatChip = ({ item }) => {
  const iconConfig = ICON_MAP[item.icon] ?? {
    name: "stats-chart-outline",
    color: colors.natural[400],
  };
  return (
    <View style={styles.statChip}>
      <View style={[styles.statIconBox, { backgroundColor: `${iconConfig.color}18` }]}>
        <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
      </View>
      <View style={styles.statTextCol}>
        <Text style={styles.statValue}>{item.value ?? "—"}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.statSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

const AdminStatsGrid = ({ statsCards }) => (
  <View style={styles.statsGrid}>
    {statsCards.map((item) => (
      <StatChip key={item.id ?? item.title} item={item} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  statChip: {
    flexBasis: "47%",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    padding: spacing[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius[8],
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  statTextCol: { flex: 1 },
  statValue: {
    fontSize: typography.fontSize.title.medium,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  statLabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
    marginTop: 1,
  },
  statSubtitle: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[350],
    fontWeight: typography.fontWeight.regular,
    marginTop: 1,
  },
});

export default AdminStatsGrid;
