import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";

/**
 * Free "send reminder to confirmed guests" action on the single-event page
 * (blueprint §8 "Event details" row).
 *
 * Content classification: the label is localized application copy and always
 * follows the UI locale — including while a send is pending. The bell icon is
 * semantic, not directional, so it is never mirrored.
 */
const ReminderButton = ({ onPress, sending = false, style }) => {
  const { t } = useTranslation("events");

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={sending}
      accessibilityLabel={t("reminder.sendAll")}
    >
      <Ionicons name="notifications-outline" size={14} color="#6B4E33" />
      <LocalizedText style={styles.label}>
        {sending ? t("reminder.sending") : t("reminder.sendAll")}
      </LocalizedText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D6B392",
    backgroundColor: "#FFF",
  },
  label: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: "#6B4E33",
  },
});

export default ReminderButton;
