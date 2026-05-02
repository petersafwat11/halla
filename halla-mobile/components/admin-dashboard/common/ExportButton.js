import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, textStyles, typography } from "../../../styles/tokens";

/**
 * ExportButton - Green download/export button for admin list headers.
 * Props:
 *   onPress  {func}   - Called when pressed
 *   loading  {bool}   - Shows spinner when true
 *   label    {string} - Button text (default "Export")
 *   style    {object} - Extra style
 */
const ExportButton = ({ onPress, loading = false, label = "Export", style }) => (
  <TouchableOpacity
    style={[styles.btn, style]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator size="small" color={colors.success[600]} />
    ) : (
      <View style={styles.content}>
        <Ionicons name="download-outline" size={16} color={colors.success[600]} />
        <Text style={styles.label}>{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[8],
    borderWidth: 1,
    borderColor: colors.success[200],
    minWidth: 80,
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  label: {
    ...textStyles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success[600],
  },
});

export default ExportButton;
