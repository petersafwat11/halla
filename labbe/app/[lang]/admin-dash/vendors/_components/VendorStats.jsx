"use client";

import { useAdminVendors } from "@/hooks/reactQueryHooks/useAdmin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaStore, FaCheckCircle, FaClock, FaBan } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function VendorStats() {
  const { t } = useTranslation("adminDashboard");
  const searchParams = useSearchParams();

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminVendors(filters);

  const statsCards = useMemo(() => {
    const vendors = data?.data?.vendors || data?.data || [];
    const total = data?.data?.pagination?.total || vendors.length;
    const approved = vendors.filter((v) => v.vendorStatus === "approved").length;
    const pending = vendors.filter((v) => v.vendorStatus === "pending").length;
    const rejected = vendors.filter((v) => v.vendorStatus === "rejected").length;

    return [
      {
        src: <FaStore style={{ color: "#C28E5C", fontSize: "2.4rem" }} />,
        alt: "total-vendors",
        title: t("vendors.stats.total", "إجمالي التجار"),
        value: total,
        subtitle: t("vendors.stats.allTime", "جميع الأوقات"),
      },
      {
        src: <FaCheckCircle style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "approved-vendors",
        title: t("vendors.stats.approved", "التجار المعتمدين"),
        value: approved,
        subtitle: t("vendors.stats.activeNow", "نشط الآن"),
      },
      {
        src: <FaClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "pending-vendors",
        title: t("vendors.stats.pending", "قيد المراجعة"),
        value: pending,
        subtitle: t("vendors.stats.awaitingApproval", "في انتظار الموافقة"),
      },
      {
        src: <FaBan style={{ color: "#C0392B", fontSize: "2.4rem" }} />,
        alt: "rejected-vendors",
        title: t("vendors.stats.rejected", "مرفوض"),
        value: rejected,
        subtitle: t("vendors.stats.notApproved", "غير معتمد"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
