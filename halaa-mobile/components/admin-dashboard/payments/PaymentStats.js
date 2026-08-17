import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import StatCard from "../common/StatCard";
import { spacing, colors } from "../../../styles/tokens";
import { useTranslation } from "../../../localization";

const PaymentStats = ({ stats }) => {
  const { t } = useTranslation("admin");
  if (!stats) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      <StatCard
        icon="cash-outline"
        label={t("payments.stats.totalRevenue")}
        value={`${stats.totalRevenue || 0} ${t("payments.details.currency", "SAR")}`}
        color={colors.success[500]}
      />
      <StatCard
        icon="time-outline"
        label={t("payments.stats.pending")}
        value={stats.pending || 0}
        color={colors.warning[500]}
      />
      <StatCard
        icon="checkmark-circle-outline"
        label={t("payments.stats.completed")}
        value={stats.completed || 0}
        color={colors.success[500]}
      />
      <StatCard
        icon="close-circle-outline"
        label={t("payments.stats.failed")}
        value={stats.failed || 0}
        color={colors.error[500]}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing[16], gap: spacing[12] },
});

export default PaymentStats;
