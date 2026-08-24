import React from "react";
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, textStyles, typography } from "../../../styles/tokens";
import { useTranslation } from "../../../localization";
import LocalizedText from "../../commen/LocalizedText";

const ExportButton = ({ onPress, loading = false, label, style }) => {
  const { t } = useTranslation("admin");
  const displayLabel = label || t("common.export");

  return (
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
            <Ionicons name="share-outline" size={16} color={colors.success[600]} />
            <LocalizedText style={styles.label}>{displayLabel}</LocalizedText>
          </View>
      )}
    </TouchableOpacity>
  );
};

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
