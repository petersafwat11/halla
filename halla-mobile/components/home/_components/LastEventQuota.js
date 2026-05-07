import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";

export default function LastEventQuota({ quota }) {
  const { t } = useTranslation("home");
  if (!quota) return null;

  const remaining =
    quota.remainingGuests == null
      ? t("lastEvent.quota.unlimited")
      : quota.remainingGuests;

  return (
    <View style={styles.quotaRow}>
      <View style={styles.quotaItem}>
        <Text style={styles.quotaLabel}>{t("lastEvent.quota.remainingGuests")}</Text>
        <Text style={styles.quotaValue}>{remaining}</Text>
      </View>
      <View style={styles.quotaSeparator} />
      <View style={styles.quotaItem}>
        <Text style={styles.quotaLabel}>{t("lastEvent.quota.compensationMessages")}</Text>
        <Text style={styles.quotaValue}>{quota.compensationMessages ?? 0}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quotaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9F4EF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8D4C4",
  },
  quotaItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  quotaLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "#656565",
    lineHeight: 16,
  },
  quotaValue: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: "#2C2C2C",
    lineHeight: 20,
  },
  quotaSeparator: {
    width: 1,
    height: 28,
    backgroundColor: "#E8D4C4",
  },
});
