import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, typography, backgrounds } from "../../../styles/tokens";

const TABS = [
  { key: "all",         labelKey: "plans.tabs.all" },
  { key: "host_event",  labelKey: "plans.types.host_event" },
  { key: "host_monthly", labelKey: "plans.types.host_monthly" },
  { key: "business",    labelKey: "plans.types.business" },
  { key: "trial",       labelKey: "plans.types.trial" },
];

const PlanTabs = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation("admin");

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.container}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => onTabChange(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: backgrounds.artboard,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    flexDirection: "row",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    gap: spacing[8],
  },
  tab: {
    paddingHorizontal: spacing[16],
    height: 44,
    minWidth: 72,
    borderRadius: borderRadius[20],
    backgroundColor: backgrounds.card[1],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.natural[200],
    flexShrink: 0,
  },
  activeTab: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  tabText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: typography.fontSize.label.large,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[500],
  },
  activeTabText: {
    color: colors.natural[50],
  },
});

export default PlanTabs;
