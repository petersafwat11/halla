import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { borderRadius, typography, spacing } from "../../../styles/tokens";
import { getStatusVisual } from "../../../constants/statusColors";

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
  const getStatusColor = () => {
    const { fg, bg } = getStatusVisual(status, domain);
    return { background: bg, text: fg };
  };

  const getStatusLabel = () => {
    // Convert status to readable format
    return status
      .replace(/[_-]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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
