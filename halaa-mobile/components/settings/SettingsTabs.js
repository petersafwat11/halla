import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation, useLanguage } from "../../localization";
import DirectionalIonicon from "../common/DirectionalIonicon";
import LocalizedText from "../commen/LocalizedText";
import { colors } from "../../styles/tokens";

const SettingsTabs = ({ activeTab, onTabChange, onLogout }) => {
  const { t } = useTranslation("settings");
  const { isRTL } = useLanguage();
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
      id: "privacy",
      label: t("tabs.privacy"),
      icon: "shield-checkmark-outline",
    },
    {
      id: "terms",
      label: t("tabs.terms"),
      icon: "document-text-outline",
    },
    {
      id: "communityRules",
      label: t("tabs.communityRules"),
      icon: "people-outline",
    },
    {
      id: "refund",
      label: t("tabs.refund"),
      icon: "card-outline",
    },
    {
      id: "deletion",
      label: t("tabs.deletionPolicy", t("tabs.deletion")),
      icon: "document-text-outline",
    },
    {
      id: "support",
      label: t("tabs.support"),
      icon: "help-buoy-outline",
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
              color={activeTab === tab.id ? colors.primary[500] : colors.natural[500]}
            />

            <LocalizedText
              role="label"
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </LocalizedText>
          </View>
          <DirectionalIonicon
            name="chevron-forward-outline"
            size={20}
            color={activeTab === tab.id ? colors.primary[500] : colors.natural[350]}
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
          {/* The logout glyph points "out" toward the reading end, so it
              flips with the locale like other directional glyphs. */}
          <Ionicons
            name="log-out-outline"
            size={22}
            color="#e74c3c"
            style={isRTL ? styles.logoutIconRTL : null}
          />
          <LocalizedText role="label" style={[styles.tabLabel, styles.logoutLabel]}>
            {t("tabs.logout")}
          </LocalizedText>
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
  logoutIconRTL: {
    // RTL only: mirror the "exit" arrow toward the logical end.
    transform: [{ rotate: "180deg" }],
  },
});

export default SettingsTabs;
