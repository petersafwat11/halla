import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  backgrounds,
} from "../../../styles/tokens";

/**
 * DataListItem - Base list item component
 *
 * @param {Object} props
 * @param {string} props.title - Main title text
 * @param {string} props.subtitle - Subtitle text
 * @param {React.ReactNode} props.rightContent - Content to display on the right
 * @param {Function} props.onPress - Press handler
 * @param {boolean} props.selected - Selected state
 * @param {string|Object} props.avatar - Avatar image source or icon name
 * @param {React.ReactNode} props.badge - Badge component
 */
const DataListItem = ({
  title,
  subtitle,
  rightContent,
  onPress,
  selected = false,
  avatar,
  badge,
}) => {
  const renderAvatar = () => {
    if (!avatar) return null;

    if (typeof avatar === "string") {
      // If avatar is a string, treat it as an icon name
      return (
        <View style={styles.avatarContainer}>
          <Ionicons name={avatar} size={24} color={colors.primary[500]} />
        </View>
      );
    }

    // Otherwise, treat it as an image source
    return <Image source={avatar} style={styles.avatarImage} />;
  };

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.selectedContainer]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {renderAvatar()}

      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightContainer}>
          {badge}
          {rightContent}
          {onPress && !rightContent && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.natural[450]}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

DataListItem.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  rightContent: PropTypes.node,
  onPress: PropTypes.func,
  selected: PropTypes.bool,
  avatar: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.number,
  ]),
  badge: PropTypes.node,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[12],
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[8],
    marginBottom: spacing[8],
  },
  selectedContainer: {
    backgroundColor: `${colors.primary[500]}10`,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[20],
    backgroundColor: `${colors.primary[500]}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing[12],
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius[20],
    marginRight: spacing[12],
  },
  contentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textContainer: {
    flex: 1,
    marginRight: spacing[8],
  },
  title: {
    fontSize: typography.fontSize.body.medium,
    fontWeight: typography.fontWeight.medium,
    color: colors.natural[900],
    marginBottom: spacing[4],
  },
  subtitle: {
    fontSize: typography.fontSize.body.small,
    color: colors.natural[450],
    fontWeight: typography.fontWeight.regular,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
});

export default DataListItem;
