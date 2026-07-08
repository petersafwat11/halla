import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const AdminMonthlyEventsChart = ({ monthlyEvents, t }) => {
  if (!monthlyEvents || monthlyEvents.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("dashboard.charts.monthlyEvents")}</Text>
        <Text style={styles.emptyText}>{t("dashboard.charts.noData")}</Text>
      </View>
    );
  }

  const maxCount = Math.max(...monthlyEvents.map((d) => d.count || 0), 1);
  const total = monthlyEvents.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t("dashboard.charts.monthlyEvents")}</Text>
        <Text style={styles.total}>{total}</Text>
      </View>
      <View style={styles.barsContainer}>
        {monthlyEvents.map((item, index) => {
          const heightPct = (item.count / maxCount) * 100;
          return (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View style={[styles.bar, { height: `${heightPct}%` }]} />
              </View>
              <Text style={styles.barLabel}>{item.month?.slice(0, 3)}</Text>
              <Text style={styles.barValue}>{item.count}</Text>
            </View>
          );
        })}
      </View>
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
  emptyText: {
    ...textStyles.bodySmall,
    color: colors.natural[350],
    textAlign: "center",
    paddingVertical: spacing[8],
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    gap: spacing[8],
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barWrapper: {
    width: "100%",
    height: 100,
    justifyContent: "flex-end",
    backgroundColor: colors.natural[100],
    borderRadius: borderRadius[6],
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius[6],
    minHeight: 4,
  },
  barLabel: {
    ...textStyles.labelSmall,
    color: colors.natural[450],
    marginTop: spacing[4],
  },
  barValue: {
    ...textStyles.labelSmall,
    color: colors.natural[700],
    fontWeight: typography.fontWeight.semibold,
    marginTop: 2,
  },
});

export default AdminMonthlyEventsChart;
