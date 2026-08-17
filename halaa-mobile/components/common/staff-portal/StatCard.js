import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const StatCard = ({ label, value, color, icon }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#6B7280",
    textAlign: "center",
  },
});

export default StatCard;
