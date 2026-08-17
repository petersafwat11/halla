"use client";

import { useAdminDashboard } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import PieChartComponent from "@/ui/admin/dashboard/charts/pieChart/PieChart";
import CustomPieChart from "@/ui/admin/dashboard/charts/customPieChart/CustomPieChart";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./DashboardCharts.module.css";

export default function DashboardCharts() {
  const { t } = useTranslation("adminDashboard");
  const searchParams = useSearchParams();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filters = {
    period: searchParams.get("period") || "month",
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data: responseData, isLoading, error } = useAdminDashboard(filters);
  const data = responseData?.data;

  if (isLoading) return <SimpleLoading />;

  if (error) {
    return (
      <div className={styles.error}>
        <p>{t("errors.loadFailed", "Failed to load dashboard charts")}</p>
      </div>
    );
  }

  const chartsData = data?.charts || {};

  return (
    <div className={styles.chartsGrid}>
      <div className={styles.chartBox}>
        <PieChartComponent
          data={chartsData.subscriptionsByPlan || {}}
          type="subscriptions"
          title={t("charts.subscriptions", "Subscriptions")}
        />
      </div>
      <div className={styles.chartBox}>
        <CustomPieChart data={chartsData.guestStats} />
      </div>
      <div className={styles.chartBox}>
        <PieChartComponent
          data={chartsData.tickets || {}}
          type="tickets"
          title={t("charts.tickets", "Tickets")}
        />
      </div>
    </div>
  );
}
