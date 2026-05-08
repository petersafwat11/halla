import React, { useMemo, useState, useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAdminPaymentsInfinite, useDebouncedValue } from "../../../hooks";
import { useTranslation } from "../../../localization";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../stores/authStore";
import adminDashboardService from "../../../services/adminDashboardService";
import TopBar from "../../../components/plans/TopBar";
import { PaymentStats, PaymentList } from "../../../components/admin-dashboard/payments";
import AdminPageHeader from "../../../components/admin-dashboard/common/AdminPageHeader";
import ExportButton from "../../../components/admin-dashboard/common/ExportButton";
import { backgrounds } from "../../../styles/tokens";

// Match the web admin payments filter set + backend status enum.
const FILTER_IDS = ["all", "completed", "pending", "failed", "refunded"];

const AdminPaymentsScreen = () => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const navigation = useNavigation();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const token = useAuthStore((state) => state.token);

  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const paymentsFilters = useMemo(
    () => ({
      search: debouncedSearch,
      status: filter,
    }),
    [debouncedSearch, filter]
  );

  const {
    items: payments,
    stats,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAdminPaymentsInfinite(paymentsFilters);

  useEffect(() => {
    if (error) {
      toast.error(t("common.error"));
    }
  }, [error, toast, t]);

  const filterOptions = useMemo(
    () =>
      FILTER_IDS.map((id) => ({
        id,
        label: id === "all" ? t("payments.filters.all") : t(`payments.filters.${id}`),
      })),
    [t]
  );

  const handleExport = useCallback(async () => {
    try {
      setExportLoading(true);
      await adminDashboardService.payments.export(token, {
        status: filter !== "all" ? filter : undefined,
      });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setExportLoading(false);
    }
  }, [token, filter, toast, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("payments.title")} showBack={true} />

        <AdminPageHeader
          exportButton={<ExportButton onPress={handleExport} loading={exportLoading} />}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("payments.searchPlaceholder")}
          filterOptions={filterOptions}
          activeFilter={filter}
          onFilterChange={setFilter}
        />

        <PaymentStats stats={stats} />

        <PaymentList
          payments={payments}
          loading={isLoading}
          onRefresh={refetch}
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
          loadingMore={isFetchingNextPage}
          onPressPayment={(payment) =>
            navigation.navigate("PaymentDetail", {
              paymentId: payment._id || payment.id,
            })
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: backgrounds.card[8] },
  container: { flex: 1, backgroundColor: backgrounds.artboard },
});

export default AdminPaymentsScreen;
