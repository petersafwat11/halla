"use client";

import { useAdminDashboard } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import useAuthStore from "@/stores/authStore";
import Table from "@/ui/commen/new-table/Table";
import Bottom from "@/ui/admin/dashboard/bottom/Bottom";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./RecentActivity.module.css";

const HOST_STATUS_KEYS = {
  active: "tables.recentHosts.status.active",
  pending: "tables.recentHosts.status.pending",
  suspended: "tables.recentHosts.status.suspended",
};

const HOST_STATUS_STYLES = {
  active: styles.statusBadgeActive,
  pending: styles.statusBadgePending,
  suspended: styles.statusBadgeSuspended,
};

const EVENT_STATUS_KEYS = {
  scheduled: "tables.recentEvents.status.scheduled",
  live: "tables.recentEvents.status.live",
  completed: "tables.recentEvents.status.completed",
  draft: "tables.recentEvents.status.draft",
};

const EVENT_STATUS_STYLES = {
  scheduled: styles.statusBadgeScheduled,
  live: styles.statusBadgeLive,
  completed: styles.statusBadgeCompleted,
  draft: styles.statusBadgeDraft,
};

function formatDate(value, locale = "ar-SA") {
  if (!value) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function RecentActivity() {
  const { t, i18n } = useTranslation("adminDashboard");
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

  const isWhitelabelAdmin = user?.role === "whitelabel_admin";

  const renderStatusCell = useCallback(
    (key, value) => {
      if (key === "status") {
        const labelKey = HOST_STATUS_KEYS[value] || HOST_STATUS_KEYS.active;
        const badgeClass = HOST_STATUS_STYLES[value] || styles.statusBadgeActive;
        return (
          <span className={`${styles.statusBadge} ${badgeClass}`}>
            {t(labelKey)}
          </span>
        );
      }
      if (key === "createdAt" && value) {
        return formatDate(value, i18n.language);
      }
      return value;
    },
    [t, i18n.language]
  );

  const renderEventStatusCell = useCallback(
    (key, value) => {
      if (key === "status") {
        const labelKey = EVENT_STATUS_KEYS[value] || EVENT_STATUS_KEYS.draft;
        const badgeClass = EVENT_STATUS_STYLES[value] || styles.statusBadgeDraft;
        return (
          <span className={`${styles.statusBadge} ${badgeClass}`}>
            {t(labelKey)}
          </span>
        );
      }
      if (key === "date" && value) {
        return formatDate(value, i18n.language);
      }
      return value;
    },
    [t, i18n.language]
  );

  if (isLoading) {
    return <SimpleLoading />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{t("errors.loadFailed", "Failed to load recent activity")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tables}>
        <Table
          title={t("tables.recentHosts.title", "Recent Hosts")}
          headers={[
            t("tables.recentHosts.columns.name", "Name"),
            t("tables.recentHosts.columns.email", "Email"),
            t("tables.recentHosts.columns.status", "Status"),
            t("tables.recentHosts.columns.createdAt", "Date"),
          ]}
          data={(data?.recentActivity?.hosts || []).map((host) => ({
            id: host.id,
            name: host.name,
            email: host.email,
            status: host.status,
            createdAt: host.createdAt,
          }))}
          renderCell={renderStatusCell}
          showSearch={false}
          showFilter={false}
          showExport={false}
          showCheckboxes={false}
        />
        <Table
          title={t("tables.recentEvents.title", "Recent Events")}
          headers={[
            t("tables.recentEvents.columns.title", "Title"),
            t("tables.recentEvents.columns.host", "Host"),
            t("tables.recentEvents.columns.date", "Date"),
            t("tables.recentEvents.columns.status", "Status"),
          ]}
          data={(data?.recentActivity?.events || []).map((event) => ({
            id: event.id,
            title: event.title,
            host: event.host,
            date: event.date,
            status: event.status,
          }))}
          renderCell={renderEventStatusCell}
          showSearch={false}
          showFilter={false}
          showExport={false}
          showCheckboxes={false}
        />
      </div>
      {!isWhitelabelAdmin && <Bottom bestVendors={data?.bestVendors} />}
    </div>
  );
}
