import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, textStyles } from "../../../styles/tokens";

const WhitelabelActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last, destructive }) => (
  <TouchableOpacity
    style={[styles.row, !last && styles.rowBorder]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.7}
  >
    <View style={styles.rowLeft}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={16} color={iconColor} />
        )}
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>{label}</Text>
        <Text style={styles.sublabel}>{sublabel}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.natural[300]} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.natural[150] },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing[12], flex: 1 },
  textBlock: { flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: borderRadius[8], alignItems: "center", justifyContent: "center" },
  label: { ...textStyles.bodyMedium, color: colors.natural[900], fontWeight: typography.fontWeight.semibold },
  labelDestructive: { color: colors.error[500] },
  sublabel: { fontSize: typography.fontSize.label.small, color: colors.natural[400], marginTop: 2 },
});

export default WhitelabelActionRow;
