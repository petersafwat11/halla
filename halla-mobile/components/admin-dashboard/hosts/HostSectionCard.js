import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

/**
 * SectionCard - Reusable card container with icon + title header
 */
export const SectionCard = ({ title, icon, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={14} color={colors.primary[500]} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

/**
 * InfoRow - Label / value row inside a SectionCard
 */
export const InfoRow = ({ icon, label, value, badge, last }) => (
  <View style={[styles.row, last && styles.rowLast]}>
    <View style={styles.rowLeft}>
      <Ionicons name={icon} size={14} color={colors.natural[400]} />
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    {badge ?? <Text style={styles.rowValue} numberOfLines={1}>{value ?? "—"}</Text>}
  </View>
);

const styles = StyleSheet.create({
  // Card shell
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: borderRadius[8],
    backgroundColor: `${colors.primary[500]}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...textStyles.labelLarge,
    color: colors.natural[700],
    fontWeight: typography.fontWeight.semibold,
  },

  // Info row
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
  rowValue: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[800],
    fontWeight: typography.fontWeight.medium,
    maxWidth: "55%",
    textAlign: "right",
  },
});
