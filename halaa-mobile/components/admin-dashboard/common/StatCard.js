import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  backgrounds,
  iconSizes,
} from "../../../styles/tokens";

/**
 * StatCard - Display statistics with icon and value
 *
 * @param {Object} props
 * @param {string} props.icon - Ionicons icon name
 * @param {string} props.label - Stat label text
 * @param {string|number} props.value - Main stat value
 * @param {string} props.trend - Trend direction: 'up' or 'down'
 * @param {string|number} props.trendValue - Trend percentage value
 * @param {string} props.color - Accent color (default: primary)
 */
const StatCard = ({
  icon,
  label,
  value,
  trend,
  trendValue,
  color = colors.primary[500],
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    return trend === "up" ? "trending-up" : "trending-down";
  };

  const getTrendColor = () => {
    if (!trend) return colors.natural[450];
    return trend === "up" ? colors.success[500] : colors.error[500];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={iconSizes.medium} color={color} />
        </View>
        {trend && trendValue && (
          <View style={styles.trendContainer}>
            <Ionicons name={getTrendIcon()} size={16} color={getTrendColor()} />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trendValue}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

StatCard.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.oneOf(["up", "down"]),
  trendValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: backgrounds.card[1],
    padding: spacing[16],
    borderRadius: borderRadius[12],
    minWidth: 160,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[12],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[8],
    justifyContent: "center",
    alignItems: "center",
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  trendText: {
    fontSize: typography.fontSize.body.small,
    fontWeight: typography.fontWeight.medium,
  },
  value: {
    fontSize: typography.fontSize.headline.small,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
    marginBottom: spacing[4],
  },
  label: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
  },
});

export default StatCard;
