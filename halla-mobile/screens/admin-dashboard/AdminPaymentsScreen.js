import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminPayments } from "../../hooks";
import { useTranslation } from "../../localization";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../stores/authStore";
import adminDashboardService from "../../services/adminDashboardService";
import TopBar from "../../components/plans/TopBar";
import { PaymentStats, PaymentList } from "../../components/admin-dashboard/payments";
import AdminPageHeader from "../../components/admin-dashboard/common/AdminPageHeader";
import ExportButton from "../../components/admin-dashboard/common/ExportButton";
import { backgrounds } from "../../styles/tokens";

const FILTER_IDS = ["all", "completed", "pending", "failed"];

const AdminPaymentsScreen = () => {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const token = useAuthStore((state) => state.token);

  const { data, isLoading, error, refetch } = useAdminPayments({
    page: 1,
    limit: 50,
    status: filter !== "all" ? filter : undefined,
  });

  if (error) toast.error(t("common.error"));

  const payments = useMemo(() => {
    const d = data;
    if (Array.isArray(d?.payments)) return d.payments;
    if (Array.isArray(d?.data?.payments)) return d.data.payments;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  }, [data]);

  const stats = data?.stats || data?.data?.stats;

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        p.hostName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        String(p.amount).includes(q),
    );
  }, [payments, searchQuery]);

  const filterOptions = useMemo(() => {
    const getCount = (id) =>
      id === "all" ? payments.length : payments.filter((p) => p.status === id).length;
    return FILTER_IDS.map((id) => ({
      id,
      label: id === "all" ? t("payments.filters.all") : t(`payments.filters.${id}`),
      count: getCount(id),
    }));
  }, [payments, t]);

  const handleExport = async () => {
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
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TopBar title={t("payments.title")} showBack={true} />

        {/* Sticky header: export + search + filter chips */}
        <AdminPageHeader
          exportButton={<ExportButton onPress={handleExport} loading={exportLoading} />}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("payments.searchPlaceholder")}
          filterOptions={filterOptions}
          activeFilter={filter}
          onFilterChange={setFilter}
        />

        {/* Sticky stat cards */}
        <PaymentStats stats={stats} />

        {/* Scrolling payments list */}
        <PaymentList
          payments={filteredPayments}
          loading={isLoading}
          onRefresh={refetch}
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
