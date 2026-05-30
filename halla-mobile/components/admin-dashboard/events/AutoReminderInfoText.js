import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../localization";
import { colors, spacing, textStyles } from "../../../styles/tokens";

/**
 * Small inline banner reminding the user that the platform auto-sends a
 * reminder 24h before the event. Mirrors the web component in
 * labbe/components/event-detail/AutoReminderInfoText.jsx — both use the
 * brand primary palette (the previous blue hex fallbacks were a relic
 * from the original Figma comp, not the live token set).
 */
const AutoReminderInfoText = () => {
  const { t } = useTranslation("events");
  return (
    <View style={styles.banner} accessibilityRole="text">
      <View style={styles.iconWrap}>
        <Ionicons name="time-outline" size={16} color={colors.primary[700]} />
      </View>
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
    gap: spacing[10] || 10,
    paddingVertical: spacing[10] || 10,
    paddingHorizontal: spacing[12],
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    marginHorizontal: spacing[4],
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    ...textStyles.bodyMedium,
    color: colors.primary[800],
    flex: 1,
    fontFamily: "Cairo_500Medium",
  },
});

export default AutoReminderInfoText;
