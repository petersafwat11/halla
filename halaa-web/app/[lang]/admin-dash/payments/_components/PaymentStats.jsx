"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAdminPayments } from "@/hooks/admin";
import { normalizePaymentsFilters } from "@/utils/filterNormalizer";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaMoneyBillWave, FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

const formatCurrency = (amount, isArabic, currency = "SAR") =>
  new Intl.NumberFormat(isArabic ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount || 0);

export default function PaymentStats() {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const searchParams = useSearchParams();

  const filters = useMemo(() => normalizePaymentsFilters(searchParams, { limit: 20 }), [searchParams]);

  const { data, isLoading } = useAdminPayments(filters);
  const stats = data?.data?.stats || {};

  const statsCards = useMemo(() => {
    return [
      {
        src: <FaMoneyBillWave style={{ color: "#2a8c5b", fontSize: "2.4rem" }} />,
        alt: "total-revenue",
        title: t("stats.currentMonthRevenue", "Total Revenue"),
        value: formatCurrency(stats.totalRevenue, isArabic),
        subtitle: t("dateRange.all", "All"),
      },
      {
        src: <FaCheckCircle style={{ color: "#2e7d32", fontSize: "2.4rem" }} />,
        alt: "completed",
        title: t("table.status.completed", "Completed"),
        value: stats.completed || 0,
        subtitle: t("table.status.completed", "Completed"),
      },
      {
        src: <FaClock style={{ color: "#e65100", fontSize: "2.4rem" }} />,
        alt: "pending",
        title: t("table.status.pending", "Pending"),
        value: stats.pending || 0,
        subtitle: t("table.status.pending", "Pending"),
      },
      {
        src: <FaTimesCircle style={{ color: "#c62828", fontSize: "2.4rem" }} />,
        alt: "failed",
        title: t("table.status.failed", "Failed"),
        value: stats.failed || 0,
        subtitle: t("table.status.failed", "Failed"),
      },
    ];
  }, [stats, t, isArabic]);

  if (isLoading) return <SimpleLoading />;

  return <StatsCards cards={statsCards} />;
}
