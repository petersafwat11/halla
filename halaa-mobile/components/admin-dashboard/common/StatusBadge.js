import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { borderRadius, typography, spacing } from "../../../styles/tokens";
import { getStatusVisual } from "../../../constants/statusColors";
import { useTranslation } from "../../../localization";

// Status strings can arrive from several admin domains (events, vendors,
// hosts, businesses). Their human labels live under those subtrees in the
// `admin` namespace, so we probe them in order and fall back to a readable
// title-cased version of the raw status when none is translated.
const STATUS_LABEL_GROUPS = [
  "events.status",
  "vendors.status",
  "hosts.status",
  "businesses.status",
];

const titleCase = (status) =>
  String(status || "")
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

/**
 * StatusBadge - Color-coded status indicators
 *
 * Colors come from the shared status→tone map (constants/statusColors.js), so a
 * given status renders the SAME color here and on web.
 *
 * @param {Object} props
 * @param {string} props.status - Status value (active, suspended, pending, etc.)
 * @param {string} [props.domain] - Optional domain for overrides ("payment" | "subscription" | "delivery").
 * @param {string} props.size - Badge size: small or medium
 */
const StatusBadge = ({ status, domain, size = "medium" }) => {
  const { t } = useTranslation("admin");

  const getStatusColor = () => {
    const { fg, bg } = getStatusVisual(status, domain);
    return { background: bg, text: fg };
  };

  const getStatusLabel = () => {
    const fallback = titleCase(status);
    for (const group of STATUS_LABEL_GROUPS) {
      const key = `${group}.${status}`;
      const value = t(key);
      // i18next returns the key itself when a translation is missing.
      if (value && value !== key) return value;
    }
    return fallback;
  };

  const statusColors = getStatusColor();
  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: statusColors.background },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: statusColors.text },
          isSmall && styles.textSmall,
        ]}
      >
        {getStatusLabel()}
      </Text>
    </View>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  domain: PropTypes.string,
  size: PropTypes.oneOf(["small", "medium"]),
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius[20],
    alignSelf: "flex-start",
  },
  badgeSmall: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  text: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
  },
  textSmall: {
    fontSize: 12,
  },
});

export default StatusBadge;
