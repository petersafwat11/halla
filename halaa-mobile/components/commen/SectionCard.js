import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SectionCard = ({
  title,
  icon,
  rightAction,
  children,
  style,
  contentStyle,
  collapsed = false,
  onToggle,
  accessibilityLabel,
}) => {
  const Header = onToggle ? TouchableOpacity : View;
  return (
    <View style={[styles.card, style]}>
      {(title || icon || rightAction) && (
        <Header
          style={[styles.header, collapsed && styles.headerCollapsed]}
          {...(onToggle
            ? {
                onPress: onToggle,
                accessibilityRole: "button",
                accessibilityLabel: accessibilityLabel || title,
                accessibilityState: { expanded: !collapsed },
              }
            : {})}
        >
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={20} color="#C28E5C" />
            </View>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
          {rightAction}
          {onToggle && (
            <Ionicons
              name={collapsed ? "chevron-down" : "chevron-up"}
              size={20}
              color="#777"
            />
          )}
        </Header>
      )}
      {!collapsed && <View style={[styles.content, contentStyle]}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  headerCollapsed: {
    marginBottom: 0,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FBF5EF",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#2c2c2c",
    flex: 1,
  },
  content: {
    width: "100%",
  },
});

export default SectionCard;
