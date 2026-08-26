import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { formatCount } from "@halaa/shared/utils/locale";

/**
 * RSVP summary row. All three stats (لم يرد / اعتذار / موافق) sit on ONE
 * line — each item flexes equally and truncates rather than wrapping to a
 * second row. Label + count live in ONE interpolated translation string per
 * locale ("موافق ٥" / "Accepted 5"), so punctuation/digit order is authored
 * per locale and never concatenated in JSX (blueprint §6). The colour dots
 * are physical artwork and stay in logical source order.
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
      labelKey: "lastEvent.noResponse",
      value: noResponse,
      color: "#A0A0A0",
      backgroundColor: "#F7F7F7",
      icon: "time-outline",
    },
    {
      key: "lastEvent.declinedCount",
      labelKey: "lastEvent.declined",
      value: declined,
      color: "#C0392B",
      backgroundColor: "#F9EBEA",
      icon: "close-circle-outline",
    },
    {
      key: "lastEvent.approvedCount",
      labelKey: "lastEvent.approved",
      value: approved,
      color: "#2A8C5B",
      backgroundColor: "#EAF4EF",
      icon: "checkmark-circle-outline",
    },
  ];

  return (
    <View style={styles.statsRow}>
      {items.map((item) => (
        <View
          style={[styles.statItem, { backgroundColor: item.backgroundColor }]}
          key={item.key}
        >
          <Ionicons name={item.icon} size={17} color={item.color} />
          <Text style={[styles.statValue, { color: item.color }]}>
            {formatCount(item.value, locale)}
          </Text>
          <Text style={[styles.statLabel, { color: item.color }]} numberOfLines={1}>
            {t(item.labelKey)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 78,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_500Medium",
    lineHeight: 16,
    textAlign: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    lineHeight: 24,
  },
});
