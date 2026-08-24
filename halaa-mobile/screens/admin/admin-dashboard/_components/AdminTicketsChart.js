import React from "react";
import { View, StyleSheet } from "react-native";
import LocalizedText from "../../../../components/commen/LocalizedText";
import { formatCount } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../../../localization";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const TICKET_COLORS = ["#2A8C5B", "#D38200"];

const AdminTicketsChart = ({ tickets, t }) => {
  const { currentLanguage } = useTranslation("admin");
  const resolved = tickets?.resolved || 0;
  const pending = tickets?.totalPending || 0;
  const total = tickets?.allTickets || 0;

  const items = [
    { label: t("dashboard.charts.resolved"), value: resolved, color: TICKET_COLORS[0] },
    { label: t("dashboard.charts.open"), value: pending, color: TICKET_COLORS[1] },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <LocalizedText style={styles.sectionTitle}>{t("dashboard.charts.tickets")}</LocalizedText>
        <LocalizedText style={styles.total}>{formatCount(total, currentLanguage)}</LocalizedText>
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
          <LocalizedText style={styles.legendName}>{item.label}</LocalizedText>
          <LocalizedText style={styles.legendCount}>{formatCount(item.value, currentLanguage)}</LocalizedText>
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

export default AdminTicketsChart;
