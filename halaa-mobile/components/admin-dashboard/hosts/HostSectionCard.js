import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdaptiveText from "../../commen/AdaptiveText";
import LocalizedText from "../../commen/LocalizedText";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { useTranslation } from "../../../localization";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

/**
 * SectionCard - Reusable card container with icon + title header
 */
export const SectionCard = ({ title, icon, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={14} color={colors.primary[500]} />
      </View>
      <LocalizedText style={styles.cardTitle}>{title}</LocalizedText>
    </View>
    {children}
  </View>
);

/**
 * InfoRow - Label / value row inside a SectionCard
 *
 * The label is app copy and always follows the UI locale. The value mode is
 * declared per row (blueprint §5):
 *   - "adaptive"   (default) arbitrary user/backend content — first-strong
 *                  direction with isolation (names, addresses, plan names);
 *   - "ltr"        intrinsically LTR tokens — email, URL, username, IDs;
 *   - "phone"      LTR digits once present;
 *   - "localized"  locale-formatted app values (dates, counts) that follow
 *                  the UI locale.
 */
export const InfoRow = ({ icon, label, value, badge, last, mode = "adaptive" }) => {
  const { isRTL } = useTranslation();

  if (badge || mode === "adaptive") {
    return (
      <View style={[styles.row, last && styles.rowLast]}>
        <View style={styles.rowLeft}>
          <Ionicons name={icon} size={14} color={colors.natural[400]} />
          <LocalizedText style={styles.rowLabel}>{label}</LocalizedText>
        </View>
        {badge ?? (
          <AdaptiveText style={styles.rowValue} numberOfLines={1}>
            {value ?? "—"}
          </AdaptiveText>
        )}
      </View>
    );
  }

  const isLtrValue = mode === "ltr" || mode === "phone";
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={14} color={colors.natural[400]} />
        <LocalizedText style={styles.rowLabel}>{label}</LocalizedText>
      </View>
      <LocalizedText
        style={[styles.rowValue, isLtrValue ? styles.ltrValue : null]}
        numberOfLines={1}
      >
        {isLtrValue ? isolateLtr(value ?? "—") : (value ?? "—")}
      </LocalizedText>
    </View>
  );
};

const styles = StyleSheet.create({
  // Card shell
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: borderRadius[8],
    backgroundColor: `${colors.primary[500]}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...textStyles.labelLarge,
    color: colors.natural[700],
    fontWeight: typography.fontWeight.semibold,
  },

  // Info row
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[150],
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
  },
  rowValue: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[800],
    fontWeight: typography.fontWeight.medium,
    maxWidth: "55%",
  },
  ltrValue: {
    writingDirection: "ltr",
  },
});
