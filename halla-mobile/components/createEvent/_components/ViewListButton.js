import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";

const ListIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path d="M6.66667 5H17.5M6.66667 10H17.5M6.66667 15H17.5M2.5 5H2.50833M2.5 10H2.50833M2.5 15H2.50833" stroke="#C28E5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ViewListButton({ count, onPress, t }) {
  return (
    <TouchableOpacity style={styles.viewListButton} onPress={onPress} activeOpacity={0.7}>
      <ListIcon />
      <Text style={styles.viewListButtonText}>{t("events.viewList", { count })}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  viewListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#C28E5C",
    gap: 8,
  },
  viewListButtonText: { fontSize: 16, fontFamily: "Cairo_600SemiBold", color: "#C28E5C" },
});
