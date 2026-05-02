import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUnreadCount } from "../../hooks/queries/useNotifications";

const NotificationBell = ({ onPress, color = "#F9F4EF", size = 20 }) => {
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count || 0;

  const formatCount = (count) => {
    if (count > 99) return "99+";
    return count.toString();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      accessibilityLabel={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatCount(unreadCount)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Cairo_700Bold",
    lineHeight: 14,
  },
});

export default NotificationBell;
