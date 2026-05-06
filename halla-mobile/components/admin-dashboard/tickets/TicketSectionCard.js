import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "../../../styles/tokens";

const TicketSectionCard = ({ title, icon, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary[500]} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const TicketInfoRow = ({ icon, label, value, badge, last }) => (
  <View style={[styles.infoRow, last && styles.infoRowLast]}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={15} color={colors.natural[400]} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    {badge || <Text style={styles.infoValue} numberOfLines={1}>{value ?? "—"}</Text>}
  </View>
);

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius[16],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.primary[500]}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, color: colors.natural[700], fontWeight: "600" },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: spacing[8], flex: 1 },
  infoLabel: { fontSize: typography.fontSize.body.small, color: colors.natural[450] },
  infoValue: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[800],
    fontWeight: "500",
    maxWidth: "55%",
    textAlign: "right",
  },
});

export { TicketSectionCard, TicketInfoRow };
