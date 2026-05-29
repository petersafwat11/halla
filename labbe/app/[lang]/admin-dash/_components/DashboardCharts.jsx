"use client";

import { useAdminDashboard } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import PieChartComponent from "@/ui/admin/dashboard/charts/pieChart/PieChart";
import CustomPieChart from "@/ui/admin/dashboard/charts/customPieChart/CustomPieChart";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import useAuthStore from "@/stores/authStore";
import styles from "./DashboardCharts.module.css";

const chartColors = {
  barFill: "#C28E5C",
  gridStroke: "#f0f0f0",
  bgFill: "#f0f0f0",
};

export default function DashboardCharts() {
  const { t } = useTranslation("adminDashboard");
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filters = {
    period: searchParams.get("period") || "month",
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data: responseData, isLoading, error } = useAdminDashboard(filters);
  const data = responseData?.data;

  const isWhitelabelRole =
    user?.role === "whitelabel_admin" || user?.role === "whitelabel_moderator";

  const chartTheme = useMemo(() => ({
    xAxisTick: { fontSize: 11, fontFamily: "Cairo" },
    yAxisTick: { fontSize: 11 },
    tooltipContent: { fontFamily: "Cairo", fontSize: 12 },
    gridStrokeDasharray: "3 3",
  }), []);

  if (isLoading) return <SimpleLoading />;

  if (error) {
    return (
      <div className={styles.error}>
        <p>{t("errors.loadFailed", "Failed to load dashboard charts")}</p>
      </div>
    );
  }

  if (isWhitelabelRole) {
    const analytics = data?.analytics || {};
    const monthlyEvents = analytics.monthlyEvents || [];
    const eventsByStatus = analytics.eventsByStatus || {};
    const monthlyTotal = monthlyEvents.reduce((sum, d) => sum + d.count, 0);

    return (
      <div className={`${styles.chartsGrid} ${styles.whitelabelGrid}`}>
        <div className={styles.chartBox}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>{t("charts.whitelabel.monthlyEvents", "Monthly Events")}</h3>
            <p className={styles.chartTotal}>{monthlyTotal}</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={monthlyEvents}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray={chartTheme.gridStrokeDasharray}
                vertical={false}
                stroke={chartColors.gridStroke}
              />
              <XAxis
                dataKey="month"
                tick={chartTheme.xAxisTick}
              />
              <YAxis tick={chartTheme.yAxisTick} allowDecimals={false} />
              <Tooltip
                contentStyle={chartTheme.tooltipContent}
                formatter={(value) => [value, t("charts.whitelabel.events", "Events")]}
              />
              <Bar dataKey="count" fill={chartColors.barFill} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartBox}>
          <PieChartComponent
            data={eventsByStatus}
            type="eventsByStatus"
            title={t("charts.whitelabel.eventsByStatus", "Events by Status")}
          />
        </div>
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
