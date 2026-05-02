import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import { colors, spacing, borderRadius, textStyles, backgrounds } from "../../../styles/tokens";

const TABS = [
  { key: "all",          labelKey: "plans.tabs.all" },
  { key: "single_event", labelKey: "plans.types.single_event" },
  { key: "subscription", labelKey: "plans.types.subscription" },
  { key: "enterprise",   labelKey: "plans.types.enterprise" },
  { key: "trial",        labelKey: "plans.types.trial" },
];

const PlanTabs = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation("admin");

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
    backgroundColor: backgrounds.card[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.natural[200],
  },
  container: {
    flexDirection: "row",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  tab: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: borderRadius[20],
    backgroundColor: colors.natural[150],
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    ...textStyles.labelMedium,
    color: colors.natural[500],
  },
  activeTabText: {
    color: colors.natural[50],
  },
});

export default PlanTabs;
