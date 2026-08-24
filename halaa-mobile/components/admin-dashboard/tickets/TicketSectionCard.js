import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdaptiveText from "../../commen/AdaptiveText";
import LocalizedText from "../../commen/LocalizedText";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import { colors, spacing, borderRadius, typography } from "../../../styles/tokens";

/**
 * TicketSectionCard - Reusable card container with icon + title header.
 *
 * The section title is app copy and always follows the UI locale. Header
 * icons are semantic (message/attachment/details) — never mirrored.
 */
const TicketSectionCard = ({ title, icon, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={colors.primary[500]} />
      </View>
      <LocalizedText style={styles.sectionTitle}>{title}</LocalizedText>
    </View>
    {children}
  </View>
);

/**
 * TicketInfoRow - Label / value row inside a TicketSectionCard.
 *
 * The label is app copy and always follows the UI locale; it never changes
 * with the value's script (blueprint §5.1). The value mode is declared per
 * row (blueprint §5):
 *   - "adaptive"   (default) arbitrary user/backend content — first-strong
 *                  direction with isolation (names, categories);
 *   - "ltr"        intrinsically LTR tokens — email, username, IDs;
 *   - "localized"  locale-formatted app values (dates, counts) rendered with
 *                  first-strong isolation so mixed digit runs cannot split.
 */
const TicketInfoRow = ({ icon, label, value, badge, last, mode = "adaptive" }) => {
  if (badge || mode === "adaptive") {
    return (
      <View style={[styles.infoRow, last && styles.infoRowLast]}>
        <View style={styles.infoLeft}>
          <Ionicons name={icon} size={15} color={colors.natural[400]} />
          <LocalizedText style={styles.infoLabel}>{label}</LocalizedText>
        </View>
        {badge ?? (
          <AdaptiveText style={styles.infoValue} numberOfLines={1}>
            {value ?? "—"}
          </AdaptiveText>
        )}
      </View>
    );
  }

  const isLtrValue = mode === "ltr";
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={15} color={colors.natural[400]} />
        <LocalizedText style={styles.infoLabel}>{label}</LocalizedText>
      </View>
      <LocalizedText
        style={[styles.infoValue, isLtrValue ? styles.ltrValue : null]}
        numberOfLines={1}
      >
        {isLtrValue ? isolateLtr(value ?? "—") : (value ?? "—")}
      </LocalizedText>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: borderRadius[16],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.primary[500]}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, color: colors.natural[700], fontWeight: "600" },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[100],
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: spacing[8], flex: 1 },
  infoLabel: { fontSize: typography.fontSize.body.small, color: colors.natural[450] },
  infoValue: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[800],
    fontWeight: "500",
    maxWidth: "55%",
  },
  ltrValue: {
    writingDirection: "ltr",
  },
});

export { TicketSectionCard, TicketInfoRow };
