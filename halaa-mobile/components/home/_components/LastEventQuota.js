import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { formatCount } from "@halaa/shared/utils/locale";

import InvitationBalanceCard from "../../events/InvitationBalanceCard";

export default function LastEventQuota({ quota, balance }) {
  const { t, currentLanguage } = useTranslation("home");
  const locale = currentLanguage || "ar";

  const effectiveBalance =
    balance ||
    (quota && (typeof quota.unlimited === "boolean" || quota.total !== undefined)
      ? quota
      : null);

  if (effectiveBalance) {
    return (
      <InvitationBalanceCard
        compact
        balance={effectiveBalance}
        returnTo="Home"
      />
    );
  }

  if (!quota) return null;

  // Backend returns null for unlimited, a number (including 0) otherwise.
  // The number is formatted with the locale's digit system as one atomic
  // token; "unlimited" is authored copy.
  const remaining =
    quota.remainingInvites == null
      ? t("lastEvent.quota.unlimited")
      : formatCount(quota.remainingInvites, locale);

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
