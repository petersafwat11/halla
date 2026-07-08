import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { colors, spacing, typography, iconSizes } from "../../../styles/tokens";
import ActionButton from "./ActionButton";

/**
 * EmptyState - No data placeholder
 *
 * @param {Object} props
 * @param {string} props.icon - Ionicons icon name
 * @param {string} props.title - Main title text
 * @param {string} props.message - Description message
 * @param {string} props.actionLabel - Action button label
 * @param {Function} props.onAction - Action button handler
 */
const EmptyState = ({ icon, title, message, actionLabel, onAction }) => {
  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={iconSizes.xlarge}
            color={colors.natural[450]}
          />
        </View>
      )}

      <Text style={styles.title}>{title}</Text>

      {message && <Text style={styles.message}>{message}</Text>}

      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <ActionButton
            label={actionLabel}
            onPress={onAction}
            variant="primary"
          />
        </View>
      )}
    </View>
  );
};

EmptyState.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[48],
  },
  iconContainer: {
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.fontSize.title.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
    textAlign: "center",
    marginBottom: spacing[12],
  },
  message: {
    fontSize: typography.fontSize.body.medium,
    color: colors.natural[450],
    textAlign: "center",
    lineHeight: typography.fontSize.body.medium * 1.5,
    marginBottom: spacing[24],
  },
  actionContainer: {
    marginTop: spacing[8],
  },
});

export default EmptyState;
