import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LocalizedText from "../../../../components/commen/LocalizedText";
import { formatCount } from "@halaa/shared/utils/locale";
import { useTranslation } from "../../../../localization";
import { colors, spacing, borderRadius, typography, textStyles, backgrounds } from "../../../../styles/tokens";

const PLAN_COLORS = [
  "#3498DB",
  colors.primary[500],
  "#9B59B6",
  colors.success[500],
  colors.warning[500],
];

const AdminSubscriptionsChart = ({ subscriptionsByPlan, t }) => {
  const { currentLanguage } = useTranslation("admin");
  const planEntries = Object.entries(subscriptionsByPlan);
  const totalSubs = planEntries.reduce((sum, [, count]) => sum + count, 0);

  const planLabel = (key) => {
    const k = (key || "").toLowerCase();
    const chartTrans = t(`dashboard.charts.${k}`);
    if (chartTrans && chartTrans !== `dashboard.charts.${k}`) return chartTrans;
    const discountTrans = t(`discounts.planTypes.${k}`);
    if (discountTrans && discountTrans !== `discounts.planTypes.${k}`) return discountTrans;
    return key;
  };

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="pie-chart-outline" size={18} color={colors.primary[500]} />
          <LocalizedText style={styles.sectionTitle}>{t("dashboard.charts.subscriptions")}</LocalizedText>
        </View>
      </View>
      {planEntries.length === 0 ? (
        <LocalizedText center style={styles.emptyText}>{t("dashboard.charts.noData")}</LocalizedText>
      ) : (
        <>
          <View style={styles.segmentedBar}>
            {planEntries.map(([plan, count], idx) => (
              <View
                key={plan}
                style={{
                  flex: count / totalSubs,
                  height: 8,
                  backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length],
                  borderRadius: borderRadius[8],
                }}
              />
            ))}
          </View>
          {planEntries.map(([plan, count], idx) => (
            <View key={plan} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }]} />
              <LocalizedText style={styles.legendName}>{planLabel(plan)}</LocalizedText>
              <LocalizedText style={styles.legendCount}>{formatCount(count, currentLanguage)}</LocalizedText>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: backgrounds.card[1],
    borderRadius: borderRadius[12],
    borderWidth: 1,
    borderColor: colors.natural[200],
    padding: spacing[16],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[12],
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  sectionTitle: {
    ...textStyles.bodyLarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.natural[900],
  },
  segmentedBar: {
    flexDirection: "row",
    gap: 2,
    marginBottom: spacing[12],
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[4],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    ...textStyles.labelLarge,
    color: colors.natural[700],
    flex: 1,
  },
  legendCount: {
    ...textStyles.labelLarge,
    color: colors.natural[500],
    fontWeight: typography.fontWeight.semibold,
  },
  emptyText: {
    ...textStyles.bodySmall,
    color: colors.natural[350],
    textAlign: "center",
    paddingVertical: spacing[8],
  },
});

export default AdminSubscriptionsChart;
