import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { colors, spacing, textStyles } from "../../../styles/tokens";

/**
 * Small inline banner reminding the user that the platform auto-sends a
 * reminder 24h before the event. Mirrors the web component in
 * labbe/components/event-detail/AutoReminderInfoText.jsx.
 */
const AutoReminderInfoText = () => {
  const { t } = useTranslation("events");
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Ionicons
        name="time-outline"
        size={18}
        color={colors.primary[600]}
        style={styles.icon}
      />
      <Text style={styles.text}>
        {t(
          "autoReminderInfo",
          "We automatically send a reminder to your guests 24 hours before the event."
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: 10,
    backgroundColor: colors.primary?.[50] || "#EEF6FF",
    marginHorizontal: spacing[4],
  },
  icon: { marginRight: spacing[4] },
  text: {
    ...textStyles.bodyMedium,
    color: colors.primary?.[700] || "#1F3A5F",
    flex: 1,
  },
});

export default AutoReminderInfoText;
