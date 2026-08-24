import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import StatCard from "../common/StatCard";
import { spacing, colors } from "../../../styles/tokens";
import { useTranslation } from "../../../localization";
import { formatCount, formatCurrency } from "@halaa/shared/utils/locale";
import { isolateAuto } from "@halaa/shared/utils/bidi";

const PaymentStats = ({ stats }) => {
  const { t, currentLanguage } = useTranslation("admin");
  if (!stats) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Revenue is one atomic locale currency token; counts are formatted
          per the UI locale — never raw toLocaleString at render sites. */}
      <StatCard
        icon="cash-outline"
        label={t("payments.stats.totalRevenue")}
        value={isolateAuto(formatCurrency(stats.totalRevenue || 0, currentLanguage))}
        color={colors.success[500]}
      />
      <StatCard
        icon="time-outline"
        label={t("payments.stats.pending")}
        value={formatCount(stats.pending || 0, currentLanguage)}
        color={colors.warning[500]}
      />
      <StatCard
        icon="checkmark-circle-outline"
        label={t("payments.stats.completed")}
        value={formatCount(stats.completed || 0, currentLanguage)}
        color={colors.success[500]}
      />
      <StatCard
        icon="close-circle-outline"
        label={t("payments.stats.failed")}
        value={formatCount(stats.failed || 0, currentLanguage)}
        color={colors.error[500]}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing[16], gap: spacing[12] },
});

export default PaymentStats;
