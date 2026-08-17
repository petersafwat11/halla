import React from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PlanListItem from "./PlanListItem";
import { useTranslation } from "../../../localization";
import {
  colors,
  spacing,
  textStyles,
  backgrounds,
} from "../../../styles/tokens";

const PlanList = ({ plans, loading, canEdit, onEdit }) => {
  const { t } = useTranslation("admin");

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="layers-outline" size={48} color={colors.natural[300]} />
        <Text style={styles.emptyTitle}>{t("plans.empty.title")}</Text>
        <Text style={styles.emptyMsg}>{t("plans.empty.message")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={plans}
      keyExtractor={(item) => item._id || item.code}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <PlanListItem
          plan={item}
          canEdit={canEdit}
          onEdit={onEdit}
        />
      )}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: spacing[40],
    alignItems: "center",
    gap: spacing[12],
  },
  loadingText: {
    ...textStyles.bodyMedium,
    color: colors.natural[450],
  },
  emptyWrap: {
    paddingVertical: spacing[40],
    paddingHorizontal: spacing[32],
    alignItems: "center",
    gap: spacing[12],
  },
  emptyTitle: {
    ...textStyles.titleMedium,
    color: colors.natural[700],
  },
  emptyMsg: {
    ...textStyles.bodySmall,
    color: colors.natural[400],
    textAlign: "center",
  },
  listContent: {
    paddingTop: spacing[8],
  },
});

export default PlanList;
