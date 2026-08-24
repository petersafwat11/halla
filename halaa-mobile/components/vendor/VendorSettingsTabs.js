import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../localization/hooks/useTranslation";
import DirectionalIonicon from "../common/DirectionalIonicon";
import LocalizedText from "../commen/LocalizedText";

/**
 * Vendor settings navigation list.
 *
 * Row anatomy is a logical row: [ semantic leading icon + localized label ]
 * ......... [ directional chevron at the reading end ]. The chevron flips
 * with the locale through DirectionalIonicon; every other icon (person,
 * shield, document, card, help) is semantic and never mirrored. The logout
 * arrow points toward the logical end of reading, so it is mirrored only
 * under RTL instead of being hard-rotated in both locales.
 */
const VendorSettingsTabs = ({ activeTab, onTabChange, onLogout }) => {
  const { t, isRTL } = useTranslation("settings");
  const tabs = [
    { id: "accountSetup", label: t("tabs.account"), icon: "person-outline" },
    { id: "privacy", label: t("tabs.privacy"), icon: "shield-checkmark-outline" },
    { id: "terms", label: t("tabs.terms"), icon: "document-text-outline" },
    { id: "communityRules", label: t("tabs.communityRules"), icon: "people-outline" },
    { id: "refund", label: t("tabs.refund"), icon: "card-outline" },
    { id: "deletion", label: t("tabs.deletionPolicy", t("tabs.deletion")), icon: "document-text-outline" },
    { id: "support", label: t("tabs.support"), icon: "help-buoy-outline" },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={tab.icon}
              size={22}
              color={activeTab === tab.id ? "#c28e5c" : "#666"}
            />
            <LocalizedText
              role="label"
              style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}
            >
              {tab.label}
            </LocalizedText>
          </View>
          <DirectionalIonicon
            name="chevron-forward-outline"
            size={20}
            color={activeTab === tab.id ? "#c28e5c" : "#999"}
          />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.tab, styles.logoutTab]}
        onPress={onLogout}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <View style={styles.tabContent}>
          {/* Base Ionicons glyph points LTR; mirror only for Arabic so the
              exit arrow always points to the logical end. */}
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
  logoutIconRTL: {
    transform: [{ rotate: "180deg" }],
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

export default VendorSettingsTabs;
