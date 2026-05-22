import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function GuestModeratorTabs({ activeTab, setActiveTab, guestCount, moderatorCount, t }) {
  return (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "guests" && styles.tabActive]}
        onPress={() => setActiveTab("guests")}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === "guests" && styles.tabTextActive]}>
          {t("event_guests_label")}
        </Text>
        {guestCount > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{guestCount}</Text></View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "moderators" && styles.tabActive]}
        onPress={() => setActiveTab("moderators")}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === "moderators" && styles.tabTextActive]}>
          {t("event_moderators_label")}
        </Text>
        {moderatorCount > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{moderatorCount}</Text></View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: "#656565" },
  tabTextActive: { color: "#C28E5C" },
  badge: {
    backgroundColor: "#C28E5C",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 12, fontFamily: "Cairo_700Bold", color: "#FFF" },
});
