import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DirectionalIonicon from "../../common/DirectionalIonicon";
import { colors, spacing } from "../../../styles/tokens";

const EventActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last, destructive }) => {
  return (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={sublabel}
    accessibilityState={{ disabled: !!loading, busy: !!loading }}
    style={[styles.actionRow, !last && styles.actionRowBorder]}
    onPress={onPress}
    disabled={loading}
  >
    <View style={styles.actionRowLeft}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        {loading
          ? <ActivityIndicator size="small" color={iconColor} />
          : <Ionicons name={icon} size={18} color={iconColor} />
        }
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, destructive && { color: colors.error[500] }]}>
          {label}
        </Text>
        {sublabel ? <Text style={styles.actionSub}>{sublabel}</Text> : null}
      </View>
    </View>
    <DirectionalIonicon name="chevron-forward" size={18} color={colors.natural[300]} />
  </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 16,
    color: colors.natural[900],
    fontWeight: "600",
  },
  actionCopy: { flex: 1, minWidth: 0, paddingEnd: 8 },
  actionSub: { fontSize: 13, lineHeight: 21, color: colors.natural[600], marginTop: 3 },
});

export default EventActionRow;
