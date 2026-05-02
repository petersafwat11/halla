import React from "react";
import { View, Text, StyleSheet } from "react-native";
import PropTypes from "prop-types";
import {
  colors,
  borderRadius,
  typography,
  spacing,
} from "../../../styles/tokens";

/**
 * StatusBadge - Color-coded status indicators
 *
 * @param {Object} props
 * @param {string} props.status - Status value (active, suspended, pending, etc.)
 * @param {string} props.size - Badge size: small or medium
 */
const StatusBadge = ({ status, size = "medium" }) => {
  const getStatusColor = () => {
    const normalizedStatus = status.toLowerCase().replace(/[_-]/g, "");

    // Success states — active, approved, resolved, live
    if (
      ["active", "approved", "success", "resolved", "live"].includes(normalizedStatus)
    ) {
      return {
        background: `${colors.success[500]}15`,
        text: colors.success[500],
      };
    }

    // Error states — suspended, rejected, inactive, failed, cancelled
    if (
      ["suspended", "rejected", "inactive", "failed", "error", "cancelled"].includes(
        normalizedStatus,
      )
    ) {
      return {
        background: `${colors.error[500]}15`,
        text: colors.error[500],
      };
    }

    // Warning states — pending, open
    if (
      ["pending", "processing", "warning", "open"].includes(normalizedStatus)
    ) {
      return {
        background: `${colors.warning[500]}15`,
        text: colors.warning[500],
      };
    }

    // Info states (blue) — scheduled, in-progress
    if (["scheduled", "inprogress"].includes(normalizedStatus)) {
      return {
        background: "#E8F4FD",
        text: "#3498DB",
      };
    }

    // Primary/accent states — draft, new
    if (["draft", "new"].includes(normalizedStatus)) {
      return {
        background: `${colors.primary[500]}15`,
        text: colors.primary[500],
      };
    }

    // Default neutral — completed, closed, unknown
    return {
      background: `${colors.natural[450]}15`,
      text: colors.natural[450],
    };
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
