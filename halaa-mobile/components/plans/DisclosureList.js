/**
 * DisclosureList — renders the required purchase disclosures for a catalog entry
 * (§7). Disclosure keys are derived from the entry's store-safe policy flags
 * (services/billing/disclosures), never hardcoded per screen.
 *
 * Mixed-token rule (blueprint §6/§9): store names, URLs and emails embedded in
 * the translated Arabic copy are wrapped with LTR isolates via the shared
 * `isolateLtrTokens` helper — the same contract as the legal renderer.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";
import { disclosuresFor } from "../../services/billing/disclosures";
import { isolateLtrTokens } from "@halaa/shared/utils/bidi";
import { colors, spacing, typography } from "../../styles/tokens";

// Intrinsically LTR tokens that appear inside disclosure copy.
const LTR_DISCLOSURE_TOKEN_REGEX =
  /App Store|Google Play|https?:\/\/[^\s)]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const DisclosureList = ({ entry, t }) => {
  const { isRTL } = useTranslation("plans");
  const keys = disclosuresFor(entry);
  if (!keys.length) return null;

  return (
    <View style={styles.wrap}>
      {keys.map((k) => (
        <View key={k} style={styles.row}>
          <Ionicons name="information-circle-outline" size={15} color={colors.natural[450]} style={styles.icon} />
          <LocalizedText style={styles.text}>
            {isolateLtrTokens(t(k), LTR_DISCLOSURE_TOKEN_REGEX, isRTL)}
          </LocalizedText>
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
