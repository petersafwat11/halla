import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../../../../components/commen/LocalizedText";
import { formatCount } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../../../localization";
import { colors, spacing, borderRadius, typography, backgrounds } from "../../../../styles/tokens";

const ICON_MAP = {
  users: { name: "people-outline", color: colors.primary[500] },
  store: { name: "storefront-outline", color: "#C28E5C" },
  calendar: { name: "calendar-outline", color: "#3498DB" },
  "calendar-check": { name: "checkmark-circle-outline", color: "#2A8C5B" },
  "credit-card": { name: "card-outline", color: "#9B59B6" },
  ticket: { name: "ticket-outline", color: colors.warning[500] },
  guests: { name: "people-outline", color: "#9B59B6" },
};

const StatChip = ({ item }) => {
  const iconConfig = ICON_MAP[item.icon] ?? {
    name: "stats-chart-outline",
    color: colors.natural[400],
  };
  return (
    <View style={styles.statChip}>
      <View style={[styles.statAccent, { backgroundColor: iconConfig.color }]} />
      <View style={[styles.statIconBox, { backgroundColor: `${iconConfig.color}18` }]}>
        <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
      </View>
      <View style={styles.statTextCol}>
        {/* Stat values are counts — formatted per the UI locale's digit system. */}
        <LocalizedText style={styles.statValue}>{item.value ?? "—"}</LocalizedText>
        <LocalizedText style={styles.statLabel} numberOfLines={2}>{item.title}</LocalizedText>
        {item.subtitle ? (
          <LocalizedText style={styles.statSubtitle} numberOfLines={2}>{item.subtitle}</LocalizedText>
        ) : null}
      </View>
    </View>
  );
};

const AdminStatsGrid = ({ statsCards }) => {
  const { currentLanguage } = useTranslation("admin");
  const localizedCards = statsCards.map((card) => ({
    ...card,
    value:
      typeof card.value === "number"
        ? formatCount(card.value, currentLanguage)
        : card.value,
  }));
  return (
    <View style={styles.statsGrid}>
      {localizedCards.map((item) => (
        <StatChip key={item.id ?? item.title} item={item} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  statChip: {
    flexBasis: "47%",
    flex: 1,
    minHeight: 142,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    overflow: "hidden",
  },
  statAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[12],
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  statTextCol: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: typography.fontSize.title.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
    textAlign: "center",
  },
  statLabel: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    fontFamily: "Cairo_500Medium",
    fontWeight: typography.fontWeight.medium,
    textAlign: "center",
    lineHeight: 18,
  },
  statSubtitle: {
    fontSize: typography.fontSize.label.small,
    color: colors.natural[350],
    fontWeight: typography.fontWeight.regular,
    textAlign: "center",
    lineHeight: 17,
  },
});

export default AdminStatsGrid;
