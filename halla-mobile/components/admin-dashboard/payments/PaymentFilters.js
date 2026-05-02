import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "../../../localization";
import FilterBar from "../common/FilterBar";
import { spacing } from "../../../styles/tokens";

const FILTER_IDS = ["all", "completed", "pending", "failed"];

const PaymentFilters = ({ activeFilter, onFilterChange }) => {
  const { t } = useTranslation("admin");

  const filters = FILTER_IDS.map((id) => ({
    id,
    label: t(`payments.filters.${id}`),
  }));

  return (
    <View style={styles.container}>
      <FilterBar
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing[16] },
});

export default PaymentFilters;
