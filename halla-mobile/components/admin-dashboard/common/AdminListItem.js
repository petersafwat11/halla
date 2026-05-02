import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdminCheckbox from "./AdminCheckbox";
import StatusBadge from "./StatusBadge";
import {
  colors,
  spacing,
  typography,
  textStyles,
  borderRadius,
  backgrounds,
} from "../../../styles/tokens";

/**
 * AdminListItem — Universal list item for all admin dashboard list pages.
 *
 * Props:
 *   title        (string)    — Primary name / heading
 *   subtitle     (string?)   — Email or secondary line shown under name
 *   subtitleAlt  (string?)   — Phone or third info line
 *   avatarColor  (string?)   — Initial-circle background color (default: primary[500])
 *   status       (string?)   — Passed to StatusBadge; omit to hide badge
 *   chips        (array?)    — [{label, color, bg, icon?}] — small tag chips below header
 *   details      (array?)    — [{icon, text, color?}] — icon + text detail rows
 *   extraContent (ReactNode) — Custom content slot for stars, ticket rows, etc.
 *   actions      (array?)    — [{key, label, icon, color, onPress, isPending?, disabled?}]
 *   selected     (bool)
 *   onSelect     (func?)     — If provided, a checkbox is shown
 *   onPress      (func?)     — Navigation / detail handler
 */
const AdminListItem = ({
  title,
  subtitle,
  subtitleAlt,
  avatarColor = colors.primary[500],
  status,
  chips,
  details,
  extraContent,
  actions,
  selected = false,
  onSelect,
  onPress,
}) => {
  const initial = title ? title.charAt(0).toUpperCase() : "?";
  const hasChips = chips && chips.length > 0;
  const hasDetails = details && details.length > 0;
  const hasActions = actions && actions.length > 0;

  return (
    <View style={[styles.card, selected && styles.selectedCard]}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
        {/* ── Header Row ── */}
        <View style={styles.headerRow}>
          {onSelect && (
            <AdminCheckbox
              checked={selected}
              onPress={onSelect}
              size={20}
              style={styles.checkbox}
            />
          )}
          <View style={[styles.avatarCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {title || "—"}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            {subtitleAlt ? (
              <Text style={styles.subtitleAlt} numberOfLines={1}>
                {subtitleAlt}
              </Text>
            ) : null}
          </View>
          {status ? <StatusBadge status={status} size="small" /> : null}
        </View>

        {/* ── Chips Row ── */}
        {hasChips && (
          <View style={styles.chipsRow}>
            {chips.map((chip, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: chip.bg }]}>
                {chip.icon ? (
                  <Ionicons name={chip.icon} size={11} color={chip.color} />
                ) : null}
                <Text style={[styles.chipText, { color: chip.color }]}>
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Details Row ── */}
        {hasDetails && (
          <View style={styles.detailsRow}>
            {details.map((d, i) => (
              <View key={i} style={styles.detailItem}>
                <Ionicons
                  name={d.icon}
                  size={14}
                  color={d.color || colors.natural[450]}
                />
                <Text
                  style={[styles.detailText, d.color ? { color: d.color } : null]}
                  numberOfLines={1}
                >
                  {d.text}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Extra Content Slot ── */}
        {extraContent ? (
          <View style={styles.extraSlot}>{extraContent}</View>
        ) : null}
      </TouchableOpacity>

      {/* ── Actions Footer ── */}
      {hasActions && (
        <View style={styles.actionsFooter}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.actionBtn}
              onPress={action.onPress}
              disabled={action.isPending || action.disabled}
              activeOpacity={0.75}
            >
              {action.isPending ? (
                <ActivityIndicator size="small" color={action.color} />
              ) : (
                <View style={styles.actionBtnContent}>
                  <Ionicons name={action.icon} size={18} color={action.color} />
                  <Text style={[styles.actionBtnText, { color: action.color }]}>
                    {action.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    marginBottom: spacing[12],
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colors.natural[200],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderColor: colors.primary[500],
    borderWidth: 2,
    backgroundColor: colors.primary[50],
  },

  // ── Header ──
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
    marginBottom: spacing[12],
  },
  checkbox: { flexShrink: 0, marginTop: 2 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarInitial: {
    fontSize: typography.fontSize.body.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[50],
  },
  nameBlock: { flex: 1 },
  title: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
    marginBottom: 2,
  },
  subtitle: {
    ...textStyles.bodySmall,
    color: colors.natural[450],
    marginTop: 2,
  },
  subtitleAlt: {
    ...textStyles.bodySmall,
    color: colors.natural[600],
    marginTop: 2,
  },

  // ── Chips ──
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
    marginBottom: spacing[10],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[8],
  },
  chipText: {
    fontSize: typography.fontSize.label.small,
    fontWeight: typography.fontWeight.medium,
  },

  // ── Details ──
  detailsRow: {
    flexDirection: "row",
    gap: spacing[16],
    flexWrap: "wrap",
    marginBottom: spacing[4],
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  detailText: {
    ...textStyles.bodySmall,
    color: colors.natural[600],
  },

  // ── Extra slot ──
  extraSlot: {
    marginTop: spacing[4],
  },

  // ── Actions Footer ──
  actionsFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.natural[200],
    paddingTop: spacing[12],
    marginTop: spacing[12],
    gap: spacing[16],
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[8],
    backgroundColor: backgrounds.card[2],
    borderRadius: borderRadius[8],
    minWidth: 60,
  },
  actionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  actionBtnText: {
    ...textStyles.bodyMedium,
    fontWeight: typography.fontWeight.medium,
  },
});

export default AdminListItem;
