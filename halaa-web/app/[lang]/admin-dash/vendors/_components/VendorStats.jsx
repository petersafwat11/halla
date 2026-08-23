"use client";

import { useAdminVendors } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { normalizeAdminFilters } from "@/utils/filterNormalizer";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaStore, FaCheckCircle, FaClock, FaBan } from "react-icons/fa";
import styles from "./VendorStats.module.css";

export default function VendorStats() {
  const { t } = useTranslation("adminVendors");
  const searchParams = useSearchParams();

  const filters = useMemo(() => normalizeAdminFilters(searchParams, { limit: 10 }), [searchParams]);

  const { data, isLoading } = useAdminVendors(filters);

  const statsCards = useMemo(() => {
    const total = data?.data?.pagination?.total || data?.pagination?.total || 0;
    const sc = data?.data?.statusCounts || data?.statusCounts || {};
    const approved = sc.approved || 0;
    const pending = sc.pending || 0;
    const rejected = sc.rejected || sc.suspended || 0;

    return [
      {
        src: <FaStore className={styles.iconTotal} />,
        alt: "total-vendors",
        title: t("stats.totalVendors"),
        value: total,
        subtitle: t("dateRange.all"),
      },
      {
        src: <FaCheckCircle className={styles.iconApproved} />,
        alt: "approved-vendors",
        title: t("stats.activeVendors"),
        value: approved,
        subtitle: t("table.status.active"),
      },
      {
        src: <FaClock className={styles.iconPending} />,
        alt: "pending-vendors",
        title: t("stats.pendingVendors"),
        value: pending,
        subtitle: t("table.status.pending"),
      },
      {
        src: <FaBan className={styles.iconRejected} />,
        alt: "rejected-vendors",
        title: t("stats.suspendedVendors"),
        value: rejected,
        subtitle: t("table.status.rejected"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
