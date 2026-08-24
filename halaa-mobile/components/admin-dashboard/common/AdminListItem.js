import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isolateLtr } from "@halaa/shared/utils/bidi";
import AdminCheckbox from "./AdminCheckbox";
import StatusBadge from "./StatusBadge";
import AdaptiveText from "../../commen/AdaptiveText";
import LocalizedText from "../../commen/LocalizedText";
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
 *   statusDomain (string?)   — Optional domain for StatusBadge color overrides ("payment" | "subscription" | "delivery")
 *   chips        (array?)    — [{label, color, bg, icon?, adaptive?}] — small tag chips below header;
 *                              `adaptive` marks backend/user chip values (names) so they resolve
 *                              first-strong instead of being pinned to the UI locale
 *   details      (array?)    — [{icon, text, color?, adaptive?, ltr?}] — icon + text detail rows;
 *                              `adaptive` marks arbitrary backend/user values (names), `ltr` marks
 *                              intrinsically LTR tokens (IDs, ticket numbers)
 *   extraContent (ReactNode) — Custom content slot for stars, ticket rows, etc.
 *   actions      (array?)    — [{key, label, icon, color, onPress, isPending?, disabled?}]
 *   selected     (bool)
 *   onSelect     (func?)     — If provided, a checkbox is shown
 *   onPress      (func?)     — Navigation / detail handler
 *
 * Title/subtitle are backend content and render through AdaptiveText
 * (first-strong direction + isolation). Action labels are app copy and stay
 * localized.
 */
/**
 * Avatar initials come from caller-provided titles that may already carry
 * BiDi isolate marks (e.g. PaymentListItem's atomic price token). Strip the
 * invisible controls first so the circle renders a real glyph.
 */
const BIDI_CONTROL_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

const AdminListItem = ({
  title,
  subtitle,
  subtitleAlt,
  avatarColor = colors.primary[500],
  status,
  statusDomain,
  chips,
  details,
  extraContent,
  actions,
  selected = false,
  onSelect,
  onPress,
}) => {
  const initial = title
    ? String(title).replace(BIDI_CONTROL_RE, "").charAt(0).toUpperCase() || "?"
    : "?";
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
            <AdaptiveText style={styles.title} numberOfLines={1}>
              {title || "—"}
            </AdaptiveText>
            {subtitle ? (
              <AdaptiveText style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </AdaptiveText>
            ) : null}
            {subtitleAlt ? (
              <AdaptiveText style={styles.subtitleAlt} numberOfLines={1}>
                {subtitleAlt}
              </AdaptiveText>
            ) : null}
          </View>
          {status ? (
            <StatusBadge status={status} domain={statusDomain} size="small" />
          ) : null}
        </View>

        {/* ── Chips Row ── */}
        {hasChips && (
          <View style={styles.chipsRow}>
            {chips.map((chip, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: chip.bg }]}>
                {chip.icon ? (
                  <Ionicons name={chip.icon} size={11} color={chip.color} />
                ) : null}
                {chip.adaptive ? (
                  /* Backend/user chip value — follows its own first-strong
                     direction, never the UI locale. */
                  <AdaptiveText style={[styles.chipText, { color: chip.color }]}>
                    {chip.label}
                  </AdaptiveText>
                ) : (
                  /* Chip labels that are app copy — always UI-locale direction. */
                  <LocalizedText style={[styles.chipText, { color: chip.color }]}>
                    {chip.label}
                  </LocalizedText>
                )}
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
                {d.adaptive ? (
                  <AdaptiveText
                    style={[styles.detailText, d.color ? { color: d.color } : null]}
                    numberOfLines={1}
                  >
                    {d.text}
                  </AdaptiveText>
                ) : d.ltr ? (
                  /* Intrinsically LTR token (ticket number, ID, phone): pinned
                     LTR and isolated so `+`/digits cannot reorder under RTL. */
                  <LocalizedText
                    style={[
                      styles.detailText,
                      styles.ltrDetailText,
                      d.color ? { color: d.color } : null,
                    ]}
                    numberOfLines={1}
                  >
                    {isolateLtr(d.text)}
                  </LocalizedText>
                ) : (
                  /* Localized detail copy (e.g. "Joined <date>") follows the
                     UI locale and never the value script. */
                  <LocalizedText
                    style={[styles.detailText, d.color ? { color: d.color } : null]}
                    numberOfLines={1}
                  >
                    {d.text}
                  </LocalizedText>
                )}
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
                  {/* Action labels are app copy — always the UI locale. */}
                  <LocalizedText style={[styles.actionBtnText, { color: action.color }]}>
                    {action.label}
                  </LocalizedText>
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
  ltrDetailText: {
    writingDirection: "ltr",
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
