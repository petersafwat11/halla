import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization";

const SettingsTabs = ({ activeTab, onTabChange, onLogout }) => {
  const { t } = useTranslation("settings");
  const tabs = [
    {
      id: "account",
      label: t("tabs.account"),
      icon: "person-outline",
    },
    {
      id: "notifications",
      label: t("tabs.notifications"),
      icon: "notifications-outline",
    },
    {
      id: "about",
      label: t("tabs.about"),
      icon: "information-circle-outline",
    },
    {
      id: "privacy",
      label: t("tabs.privacy"),
      icon: "shield-checkmark-outline",
    },
    {
      id: "terms",
      label: t("tabs.terms"),
      icon: "document-text-outline",
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={tab.icon}
              size={22}
              color={activeTab === tab.id ? "#c28e5c" : "#666"}
            />

            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={activeTab === tab.id ? "#c28e5c" : "#999"}
          />
        </TouchableOpacity>
      ))}

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.tab, styles.logoutTab]}
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <Ionicons
            name="log-out-outline"
            size={22}
            color="#e74c3c"
            style={{ transform: [{ rotate: "180deg" }] }}
          />
          <Text style={[styles.tabLabel, styles.logoutLabel]}>
            {t("tabs.logout")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  tabActive: {
    backgroundColor: "#fef9f5",
    borderColor: "#c28e5c",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-start",
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: "Cairo_600SemiBold",
    color: "#2c2c2c",
  },
  tabLabelActive: {
    color: "#c28e5c",
  },
  logoutTab: {
    marginTop: 16,
    borderColor: "#ffe5e5",
    backgroundColor: "#fff5f5",
    justifyContent: "flex-start",
  },
  logoutLabel: {
    color: "#e74c3c",
  },
});

export default SettingsTabs;
