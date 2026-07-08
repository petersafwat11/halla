import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { colors, spacing } from "../../../styles/tokens";

const EventActionRow = ({ icon, iconBg, iconColor, label, sublabel, onPress, loading, last, destructive }) => {
  const { isRTL } = useTranslation();
  return (
  <TouchableOpacity
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
      <View>
        <Text style={[styles.actionLabel, destructive && { color: colors.error[500] }]}>
          {label}
        </Text>
        {sublabel ? <Text style={styles.actionSub}>{sublabel}</Text> : null}
      </View>
    </View>
    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={colors.natural[300]} />
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
    fontSize: 14,
    color: colors.natural[900],
    fontWeight: "600",
  },
  actionSub: { fontSize: 11, color: colors.natural[400], marginTop: 1 },
});

export default EventActionRow;
