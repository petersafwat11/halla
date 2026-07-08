import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const GUEST_COLORS = ["#C28E5C", "#D6B392", "#F5ECE4"];

const AdminGuestStatsChart = ({ guestStats, t }) => {
  const confirmed = guestStats?.totalConfirmed || 0;
  const declined = guestStats?.totalDeclined || 0;
  const pending = guestStats?.totalPending || 0;
  const total = confirmed + declined + pending;

  const items = [
    { label: t("dashboard.charts.confirmed"), value: confirmed, color: GUEST_COLORS[0] },
    { label: t("dashboard.charts.declined"), value: declined, color: GUEST_COLORS[1] },
    { label: t("dashboard.charts.pending"), value: pending, color: GUEST_COLORS[2] },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t("dashboard.charts.guestResponse")}</Text>
        <Text style={styles.total}>{total}</Text>
      </View>
      {total > 0 && (
        <View style={styles.segmentedBar}>
          {items.map((item, idx) =>
            item.value > 0 ? (
              <View
                key={idx}
                style={{
                  flex: item.value / total,
                  height: 8,
                  backgroundColor: item.color,
                  borderRadius: borderRadius[8],
                }}
              />
            ) : null
          )}
        </View>
      )}
      {items.map((item, idx) => (
        <View key={idx} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendName}>{item.label}</Text>
          <Text style={styles.legendCount}>{item.value}</Text>
        </View>
      ))}
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
  segmentedBar: {
    flexDirection: "row",
    gap: 2,
    marginBottom: spacing[12],
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[4],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    ...textStyles.labelLarge,
    color: colors.natural[700],
    flex: 1,
  },
  legendCount: {
    ...textStyles.labelLarge,
    color: colors.natural[500],
    fontWeight: typography.fontWeight.semibold,
  },
});

export default AdminGuestStatsChart;
