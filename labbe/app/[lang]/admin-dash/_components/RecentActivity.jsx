"use client";

import { useAdminDashboard } from "@/hooks/reactQueryHooks/useAdmin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { cookieUtils } from "@/utils/cookieUtils";
import Table from "@/ui/commen/new-table/Table";
import Bottom from "@/ui/admin/dashboard/bottom/Bottom";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./RecentActivity.module.css";

export default function RecentActivity() {
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

  const isWhitelabelAdmin = user?.role === "whitelabel_admin";

  const renderStatusCell = (key, value) => {
    if (key === "status") {
      const statusConfig = {
        active: {
          bg: "#EAF4EF",
          color: "#2A8C5B",
          text: t("tables.recentHosts.status.active", "نشط"),
        },
        pending: {
          bg: "#FBF3E6",
          color: "#D38200",
          text: t("tables.recentHosts.status.pending", "قيد الانتظار"),
        },
        suspended: {
          bg: "#F9EBEA",
          color: "#C0392B",
          text: t("tables.recentHosts.status.suspended", "موقوف"),
        },
      };
      const config = statusConfig[value] || statusConfig.active;
      return (
        <div
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "9999px",
            background: config.bg,
          }}
        >
          <span
            style={{
              color: config.color,
              fontFamily: "Cairo",
              fontSize: "1.2rem",
            }}
          >
            {config.text}
          </span>
        </div>
      );
    }
    if (key === "createdAt" && value) {
      const date = new Date(value);
      const arabicMonths = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
      ];
      return `${date.getDate()} ${arabicMonths[date.getMonth()]} ${date.getFullYear()}`;
    }
    return value;
  };

  const renderEventStatusCell = (key, value) => {
    if (key === "status") {
      const statusConfig = {
        scheduled: {
          bg: "#E8F4FD",
          color: "#3498DB",
          text: t("tables.recentEvents.status.scheduled", "مجدول"),
        },
        live: {
          bg: "#EAF4EF",
          color: "#2A8C5B",
          text: t("tables.recentEvents.status.live", "مباشر"),
        },
        completed: {
          bg: "#F5F5F5",
          color: "#666666",
          text: t("tables.recentEvents.status.completed", "منتهي"),
        },
        draft: {
          bg: "#FBF3E6",
          color: "#D38200",
          text: t("tables.recentEvents.status.draft", "مسودة"),
        },
      };
      const config = statusConfig[value] || statusConfig.draft;
      return (
        <div
          style={{
            display: "inline-flex",
            padding: "0.3rem 1.2rem",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "9999px",
            background: config.bg,
          }}
        >
          <span
            style={{
              color: config.color,
              fontFamily: "Cairo",
              fontSize: "1.2rem",
            }}
          >
            {config.text}
          </span>
        </div>
      );
    }
    if (key === "date" && value) {
      const date = new Date(value);
      const arabicMonths = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
      ];
      return `${date.getDate()} ${arabicMonths[date.getMonth()]} ${date.getFullYear()}`;
    }
    return value;
  };

  if (isLoading) {
    return <SimpleLoading />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.tables}>
        <Table
          title={t("tables.recentHosts.title", "العملاء الجدد")}
          headers={[
            t("tables.recentHosts.columns.name", "الاسم"),
            t("tables.recentHosts.columns.email", "البريد الإلكتروني"),
            t("tables.recentHosts.columns.status", "الحالة"),
            t("tables.recentHosts.columns.createdAt", "التاريخ"),
          ]}
          data={(data?.recentActivity?.hosts || []).map((host) => ({
            id: host.id || host._id,
            name: host.username || host.name || "-",
            email: host.email || "-",
            status: host.status || "active",
            createdAt: host.createdAt || host.created_at || new Date().toISOString(),
          }))}
          renderCell={renderStatusCell}
          showSearch={false}
          showFilter={false}
          showExport={false}
          showCheckboxes={false}
        />
        <Table
          title={t("tables.recentEvents.title", "المناسبات الأخيرة")}
          headers={[
            t("tables.recentEvents.columns.title", "العنوان"),
            t("tables.recentEvents.columns.host", "المضيف"),
            t("tables.recentEvents.columns.date", "التاريخ"),
            t("tables.recentEvents.columns.status", "الحالة"),
          ]}
          data={(data?.recentActivity?.events || []).map((event) => ({
            id: event.id || event._id,
            title: event.title || "-",
            host: event.host || "-",
            date: event.date,
            status: event.status || "draft",
          }))}
          renderCell={renderEventStatusCell}
          showSearch={false}
          showFilter={false}
          showExport={false}
          showCheckboxes={false}
        />
      </div>
      {!isWhitelabelAdmin && (
        <Bottom
          bestVendors={data?.bestVendors}
          lastEvents={data?.recentActivity?.events}
        />
      )}
    </div>
  );
}
