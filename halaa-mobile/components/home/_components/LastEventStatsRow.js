import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";

export default function LastEventStatsRow({ stats }) {
  const { t } = useTranslation("home");
  const noResponse = stats?.invited ?? 0;
  const declined = stats?.declined ?? 0;
  const approved = stats?.confirmed ?? 0;
  const maybe = stats?.maybe ?? 0;

  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>{noResponse}</Text>
        <Text style={styles.statLabel}>{t("lastEvent.noResponse")}: </Text>
        <View style={[styles.statDot, { backgroundColor: "#A0A0A0" }]} />
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>{declined}</Text>
        <Text style={styles.statLabel}>{t("lastEvent.declined")}: </Text>
        <View style={[styles.statDot, { backgroundColor: "#C0392B" }]} />
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>{approved}</Text>
        <Text style={styles.statLabel}>{t("lastEvent.approved")}: </Text>
        <View style={[styles.statDot, { backgroundColor: "#2A8C5B" }]} />
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>{maybe}</Text>
        <Text style={styles.statLabel}>{t("lastEvent.maybe")}: </Text>
        <View style={[styles.statDot, { backgroundColor: "#B7791F" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
  },
  statItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#2C2C2C",
    lineHeight: 16,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 9999,
  },
});
