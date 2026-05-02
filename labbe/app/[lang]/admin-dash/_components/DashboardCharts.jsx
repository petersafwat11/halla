"use client";

import { useAdminDashboard } from "@/hooks/reactQueryHooks/useAdmin";
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
import { cookieUtils } from "@/utils/cookieUtils";
import styles from "./DashboardCharts.module.css";

const STATUS_CONFIG = [
  { key: "scheduled", label: "مجدول", color: "#3498DB" },
  { key: "live", label: "مباشر", color: "#2A8C5B" },
  { key: "completed", label: "منتهي", color: "#9B59B6" },
  { key: "draft", label: "مسودة", color: "#D38200" },
];

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

  const { data: responseData, isLoading } = useAdminDashboard(filters);
  const data = responseData?.data || responseData;

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    const userData = cookieUtils.getCookie("user");
    return userData ? JSON.parse(userData) : null;
  }, []);

  const isWhitelabelRole =
    user?.role === "whitelabel_admin" || user?.role === "whitelabel_moderator";

  if (isLoading) return null;

  // --- Whitelabel analytics view ---
  if (isWhitelabelRole) {
    const analytics = data?.analytics || {};
    const monthlyEvents = analytics.monthlyEvents || [];
    const eventsByStatus = analytics.eventsByStatus || {};
    const monthlyTotal = monthlyEvents.reduce((sum, d) => sum + d.count, 0);
    const statusTotal = Object.values(eventsByStatus).reduce((a, b) => a + b, 0);

    return (
      <div className={`${styles.chartsGrid} ${styles.whitelabelGrid}`}>
        {/* Monthly events bar chart */}
        <div className={styles.chartBox}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>المناسبات الشهرية</h3>
            <p className={styles.chartTotal}>{monthlyTotal}</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={monthlyEvents}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fontFamily: "Cairo" }}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontFamily: "Cairo", fontSize: 12 }}
                formatter={(value) => [value, "مناسبات"]}
              />
              <Bar dataKey="count" fill="#C28E5C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Events by status breakdown */}
        <div className={styles.chartBox}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>توزيع المناسبات</h3>
            <p className={styles.chartTotal}>{statusTotal}</p>
          </div>
          <div className={styles.statusList}>
            {STATUS_CONFIG.map((item) => {
              const count = eventsByStatus[item.key] || 0;
              const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0;
              return (
                <div key={item.key} className={styles.statusItem}>
                  <span
                    className={styles.statusDot}
                    style={{ background: item.color }}
                  />
                  <span className={styles.statusLabel}>{item.label}</span>
                  <div className={styles.statusBar}>
                    <div
                      className={styles.statusBarFill}
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                  <span className={styles.statusValue}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- Platform admin view (unchanged) ---
  const chartsData = data?.charts || {};

  return (
    <div className={styles.chartsGrid}>
      <div className={styles.chartBox}>
        <PieChartComponent
          data={chartsData.revenue || {}}
          type="revenue"
          title={t("charts.revenue", "الإيرادات")}
        />
      </div>
      <div className={styles.chartBox}>
        <PieChartComponent
          data={chartsData.tickets || {}}
          type="tickets"
          title={t("charts.tickets", "التذاكر")}
        />
      </div>
      <div className={styles.chartBox}>
        <PieChartComponent
          data={chartsData.subscriptionsByPlan || {}}
          type="subscriptions"
          title={t("charts.subscriptions", "الاشتراكات حسب الباقة")}
        />
      </div>
    </div>
  );
}
