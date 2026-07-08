import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const STATUS_CONFIG = [
  { key: "scheduled", labelKey: "tables.recentEvents.status.scheduled", color: "#3498DB" },
  { key: "live", labelKey: "tables.recentEvents.status.live", color: "#2A8C5B" },
  { key: "completed", labelKey: "tables.recentEvents.status.completed", color: "#9B59B6" },
  { key: "draft", labelKey: "tables.recentEvents.status.draft", color: "#D38200" },
];

const AdminEventsStatusChart = ({ eventsByStatus, t }) => {
  const statusTotal = Object.values(eventsByStatus || {}).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t("dashboard.charts.eventsByStatus")}</Text>
        <Text style={styles.total}>{statusTotal}</Text>
      </View>
      {STATUS_CONFIG.map((item) => {
        const count = eventsByStatus?.[item.key] || 0;
        const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0;
        return (
          <View key={item.key} style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: item.color }]} />
            <Text style={styles.statusLabel}>{t(item.labelKey)}</Text>
            <View style={styles.statusBar}>
              <View style={[styles.statusBarFill, { width: `${pct}%`, backgroundColor: item.color }]} />
            </View>
            <Text style={styles.statusValue}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[12],
  },
  sectionTitle: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  total: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginBottom: spacing[10],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  statusLabel: {
    ...textStyles.labelSmall,
    color: colors.natural[700],
    width: 70,
  },
  statusBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.natural[100],
    borderRadius: 4,
    overflow: "hidden",
  },
  statusBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusValue: {
    ...textStyles.labelSmall,
    color: colors.natural[900],
    fontWeight: typography.fontWeight.semibold,
    width: 28,
  },
});

export default AdminEventsStatusChart;
