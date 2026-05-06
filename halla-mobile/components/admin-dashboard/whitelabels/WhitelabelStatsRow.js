import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { backgrounds, colors, spacing, borderRadius, typography } from "../../../styles/tokens";

const WhitelabelStatPill = ({ icon, value, label, color }) => (
  <View style={[styles.pill, { borderColor: `${color}30` }]}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={[styles.value, { color }]}>{value ?? 0}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const WhitelabelStatsRow = ({ stats }) => {
  const { t } = useTranslation("admin");

  return (
    <View style={styles.row}>
      <WhitelabelStatPill icon="people-outline" value={stats.totalHosts} label={t("whitelabelDetails.hosts")} color={colors.primary[500]} />
      <WhitelabelStatPill icon="calendar-outline" value={stats.totalEvents} label={t("whitelabelDetails.events")} color={colors.warning[500]} />
      <WhitelabelStatPill icon="shield-outline" value={stats.totalModerators} label={t("whitelabelDetails.moderators")} color={colors.accent[500]} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[8] },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    backgroundColor: backgrounds.card[1],
    gap: spacing[4],
  },
  value: { fontSize: typography.fontSize.title.small, fontWeight: typography.fontWeight.semibold },
  label: { fontSize: typography.fontSize.label.small, color: colors.natural[450], textAlign: "center" },
});

export { WhitelabelStatPill, WhitelabelStatsRow };
