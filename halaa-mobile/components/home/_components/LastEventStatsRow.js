import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { formatCount } from "@halaa/shared/utils/locale";

/**
 * RSVP summary row. Label + count live in ONE interpolated translation
 * string per locale ("موافق ٥" / "Accepted 5"), so punctuation/digit order
 * is authored per locale and never concatenated in JSX (blueprint §6).
 * The colour dots are physical artwork and stay in logical source order.
 */
export default function LastEventStatsRow({ stats }) {
  const { t, currentLanguage } = useTranslation("home");
  const locale = currentLanguage || "ar";
  const noResponse = stats?.invited ?? 0;
  const declined = stats?.declined ?? 0;
  const approved = stats?.confirmed ?? 0;

  const items = [
    {
      key: "lastEvent.noResponseCount",
      value: noResponse,
      color: "#A0A0A0",
    },
    {
      key: "lastEvent.declinedCount",
      value: declined,
      color: "#C0392B",
    },
    {
      key: "lastEvent.approvedCount",
      value: approved,
      color: "#2A8C5B",
    },
  ];

  return (
    <View style={styles.statsRow}>
      {items.map((item) => (
        <View style={styles.statItem} key={item.key}>
          <View style={[styles.statDot, { backgroundColor: item.color }]} />
          <Text style={styles.statLabel} numberOfLines={1}>
            {t(item.key, { count: formatCount(item.value, locale) })}
          </Text>
        </View>
      ))}
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
    flexShrink: 1,
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
