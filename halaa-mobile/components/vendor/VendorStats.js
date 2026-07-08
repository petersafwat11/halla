import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../localization/hooks/useTranslation";

const VendorStats = ({ stats }) => {
  const { t } = useTranslation("vendor");

  const statsData = [
    {
      label: t("stats.rating"),
      value: stats?.rating || "0",
      icon: "⭐",
    },
    {
      label: t("stats.activeServices"),
      value: stats?.activeServices || 0,
      icon: "✓",
    },
    {
      label: t("stats.inactiveServices"),
      value: stats?.inactiveServices || 0,
      icon: "✕",
    },
    {
      label: t("stats.totalServices"),
      value: stats?.totalServices || 0,
      icon: "📊",
    },
  ];

  return (
    <View style={styles.container}>
      {statsData.map((stat, index) => (
        <View key={index} style={styles.statCard}>
          <Text style={styles.icon}>{stat.icon}</Text>
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: "47%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
});

export default VendorStats;
