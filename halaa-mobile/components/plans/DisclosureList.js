/**
 * DisclosureList — renders the required purchase disclosures for a catalog entry
 * (§7). Disclosure keys are derived from the entry's store-safe policy flags
 * (services/billing/disclosures), never hardcoded per screen. RTL-safe.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { disclosuresFor } from "../../services/billing/disclosures";
import { colors, spacing, typography } from "../../styles/tokens";

const DisclosureList = ({ entry, t }) => {
  const keys = disclosuresFor(entry);
  if (!keys.length) return null;

  return (
    <View style={styles.wrap}>
      {keys.map((k) => (
        <View key={k} style={styles.row}>
          <Ionicons name="information-circle-outline" size={15} color={colors.natural[450]} style={styles.icon} />
          <Text style={styles.text}>{t(k)}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.natural[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.natural[200],
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    marginBottom: spacing[12],
    gap: spacing[8],
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[8],
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: typography.fontSize.label.small,
    color: colors.natural[450],
    lineHeight: 18,
  },
});

export default DisclosureList;
