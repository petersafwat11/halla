import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../styles/tokens";

/**
 * ActionButton - Consistent action buttons
 *
 * @param {Object} props
 * @param {string} props.label - Button label text
 * @param {Function} props.onPress - Press handler
 * @param {string} props.variant - Button variant: primary, secondary, destructive, ghost
 * @param {string} props.icon - Optional Ionicons icon name
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.fullWidth - Full width button
 */
const ActionButton = ({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];

    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    if (disabled) {
      baseStyle.push(styles.disabled);
      return baseStyle;
    }

    switch (variant) {
      case "primary":
        baseStyle.push(styles.primary);
        break;
      case "secondary":
        baseStyle.push(styles.secondary);
        break;
      case "destructive":
        baseStyle.push(styles.destructive);
        break;
      case "ghost":
        baseStyle.push(styles.ghost);
        break;
      default:
        baseStyle.push(styles.primary);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];

    if (disabled) {
      baseStyle.push(styles.disabledText);
      return baseStyle;
    }

    switch (variant) {
      case "primary":
        baseStyle.push(styles.primaryText);
        break;
      case "secondary":
        baseStyle.push(styles.secondaryText);
        break;
      case "destructive":
        baseStyle.push(styles.destructiveText);
        break;
      case "ghost":
        baseStyle.push(styles.ghostText);
        break;
      default:
        baseStyle.push(styles.primaryText);
    }

    return baseStyle;
  };

  const getIconColor = () => {
    if (disabled) return colors.natural[450];

    switch (variant) {
      case "primary":
        return colors.natural[50];
      case "secondary":
        return colors.primary[500];
      case "destructive":
        return colors.natural[50];
      case "ghost":
        return colors.primary[500];
      default:
        return colors.natural[50];
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" || variant === "ghost"
              ? colors.primary[500]
              : colors.natural[50]
          }
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={getIconColor()}
              style={styles.icon}
            />
          )}
          <Text style={getTextStyle()}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

ActionButton.propTypes = {
  label: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "destructive", "ghost"]),
  icon: PropTypes.string,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: borderRadius[8],
    minHeight: 44,
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: spacing[8],
  },
  text: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.semibold,
  },
  // Primary variant
  primary: {
    backgroundColor: colors.primary[500],
  },
  primaryText: {
    color: colors.natural[50],
  },
  // Secondary variant
  secondary: {
    backgroundColor: colors.natural[50],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  secondaryText: {
    color: colors.primary[500],
  },
  // Destructive variant
  destructive: {
    backgroundColor: colors.error[500],
  },
  destructiveText: {
    color: colors.natural[50],
  },
  // Ghost variant
  ghost: {
    backgroundColor: "transparent",
  },
  ghostText: {
    color: colors.primary[500],
  },
  // Disabled state
  disabled: {
    backgroundColor: colors.natural[200],
    borderWidth: 0,
  },
  disabledText: {
    color: colors.natural[450],
  },
});

export default ActionButton;
