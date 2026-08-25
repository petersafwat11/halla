import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCount } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";

/**
 * Checked-in / total-guests summary chips on the single-event page
 * (blueprint §8 "Event details" row).
 *
 * Content classification:
 *  - labels (`checkedIn`, `totalGuests`) → localized application copy;
 *  - values → counts formatted through the shared locale utility so the
 *    digit system matches the UI language (٠١٢ / 0-9).
 *
 * Geometry stays a normal logical row (icon → label → value): the root RTL
 * architecture mirrors it automatically — no reversed rows, never physical
 * left/right spacing.
 */
const TotalGuestsChips = ({
  checkedInCount,
  totalGuests,
  showCheckedIn,
  activeFilter,
  onFilterPress,
}) => {
  const { t, currentLanguage } = useTranslation("events");

  return (
    <View style={styles.row}>
      {showCheckedIn && (
        <TouchableOpacity
          style={[styles.chip, activeFilter === "checkedIn" && styles.chipActive]}
          onPress={() => onFilterPress?.("checkedIn")}
          activeOpacity={0.7}
        >
          <Ionicons name="qr-code-outline" size={14} color="#64748B" />
          <LocalizedText style={styles.chipLabel}>
            {t("eventDetails.checkedIn")}
          </LocalizedText>
          <LocalizedText style={styles.chipValue}>
            {formatCount(checkedInCount ?? 0, currentLanguage)}
          </LocalizedText>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.chip, activeFilter === "totalGuests" && styles.chipActive]}
        onPress={() => onFilterPress?.("totalGuests")}
        activeOpacity={0.7}
      >
        <Ionicons name="people-outline" size={14} color="#6B4E33" />
        <LocalizedText style={styles.chipLabel}>
          {t("eventDetails.totalGuests")}
        </LocalizedText>
        <LocalizedText style={styles.chipValue}>
          {formatCount(totalGuests ?? 0, currentLanguage)}
        </LocalizedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingHorizontal: 4 },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  chipActive: {
    borderColor: "#C28E5C",
    borderWidth: 2,
  },
  chipLabel: { flex: 1, fontSize: 11, fontFamily: "Cairo_500Medium", color: "#656565" },
  chipValue: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#2C2C2C" },
});

export default TotalGuestsChips;
