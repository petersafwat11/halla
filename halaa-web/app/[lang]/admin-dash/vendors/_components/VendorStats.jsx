"use client";

import { useAdminVendors } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaStore, FaCheckCircle, FaClock, FaBan } from "react-icons/fa";
import styles from "./VendorStats.module.css";

export default function VendorStats() {
  const { t } = useTranslation("adminVendors");
  const searchParams = useSearchParams();

  const filters = useMemo(() => ({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  }), [searchParams]);

  const { data, isLoading } = useAdminVendors(filters);

  const statsCards = useMemo(() => {
    const vendors = data?.data?.vendors || data?.data || [];
    const total = data?.data?.pagination?.total || vendors.length;
    const approved = vendors.filter((v) => v.vendorStatus === "approved").length;
    const pending = vendors.filter((v) => v.vendorStatus === "pending").length;
    const rejected = vendors.filter((v) => v.vendorStatus === "rejected").length;

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
