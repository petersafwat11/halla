import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function LimitReachedBanner({ t }) {
  return (
    <View style={styles.limitReachedBanner}>
      <Text style={styles.limitReachedIcon}>⚠️</Text>
      <View style={styles.limitReachedContent}>
        <Text style={styles.limitReachedText}>{t("guest_limit_reached")}</Text>
        <Text style={styles.upgradeHint}>{t("upgrade_hint")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  limitReachedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  limitReachedIcon: { fontSize: 20, marginEnd: 12 },
  limitReachedContent: { flex: 1 },
  limitReachedText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: "#92400E", marginBottom: 4 },
  upgradeHint: { fontSize: 12, fontFamily: "Cairo_400Regular", color: "#92400E" },
});
