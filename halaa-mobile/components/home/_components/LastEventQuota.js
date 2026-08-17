import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";

export default function LastEventQuota({ quota }) {
  const { t } = useTranslation("home");
  if (!quota) return null;

  // Backend returns null for unlimited, a number (including 0) otherwise.
  const remaining =
    quota.remainingInvites == null
      ? t("lastEvent.quota.unlimited")
      : quota.remainingInvites;

  return (
    <View style={styles.quotaRow}>
      <Text style={styles.quotaLabel}>
        {t("lastEvent.quota.remainingInvites")}
      </Text>
      <Text style={styles.quotaValue}>{remaining}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  quotaRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8D4C4",
  },
  quotaLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
  },
  quotaValue: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 28,
  },
});
