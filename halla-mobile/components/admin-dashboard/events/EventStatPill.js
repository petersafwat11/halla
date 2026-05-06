import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "../../../styles/tokens";

const StatPill = ({ icon, label, value, color }) => (
  <View style={[styles.pill, { borderTopColor: color }]}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.pillValue, { color }]}>{value}</Text>
    <Text style={styles.pillLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius[12],
    padding: spacing[12],
    alignItems: "center",
    borderTopWidth: 3,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing[4],
  },
  pillLabel: {
    fontSize: 11,
    color: colors.natural[450],
    marginTop: spacing[4],
  },
});

export default StatPill;
