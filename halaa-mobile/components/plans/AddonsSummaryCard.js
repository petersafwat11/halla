import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "../../localization";
import LocalizedText from "../commen/LocalizedText";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { countToken, priceToken } from "@halaa/shared/utils/displayTokens";
import { colors, spacing, borderRadius, typography } from "../../styles/tokens";

const labelFor = (item, t, lang) => {
  const type = item.addonType || item.type;
  if (type === "extra_invites") {
    return t("summary.addonItems.extra_invites", {
      quantity: countToken(item.quantity, lang),
    });
  }
  if (type === "design_template") {
    return t("summary.addonItems.design_template");
  }
  // Unknown backend type — canonical Latin token, kept isolated.
  return isolateLtr(type);
};

/**
 * Selected add-ons breakdown. Prices are atomic LTR-isolated tokens; labels
 * follow the UI locale (blueprint §6).
 */
const AddonsSummaryCard = ({ addonItems = [], t }) => {
  const { i18n } = useTranslation("plans");
  const lang = i18n.language || "ar";
  if (!addonItems.length) return null;

  const sarLabel = t("common.currency.sar");

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <LocalizedText style={styles.cardTitle}>
          {t("summary.addonsTitle")}
        </LocalizedText>
      </View>
      <View style={styles.cardContent}>
        {addonItems.map((item, idx) => (
          <View key={idx} style={styles.row}>
            <LocalizedText style={styles.label} numberOfLines={2}>
              {labelFor(item, t, lang)}
            </LocalizedText>
            <Text style={styles.value}>{priceToken(item.price, sarLabel)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.natural[50],
    borderRadius: borderRadius[16],
    padding: spacing[16],
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  cardHeader: {
    paddingBottom: spacing[8],
    marginBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  cardTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: typography.fontSize.title.small,
    color: colors.secondary[700],
  },
  cardContent: {
    gap: spacing[8],
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[12],
  },
  label: {
    flex: 1,
    fontFamily: "Cairo_500Medium",
    fontSize: typography.fontSize.body.small,
    color: colors.secondary[700],
  },
  value: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.body.small,
    color: colors.accent[500],
  },
});

export default AddonsSummaryCard;
