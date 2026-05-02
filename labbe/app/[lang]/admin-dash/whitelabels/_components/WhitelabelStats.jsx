"use client";

import { useAdminWhitelabels } from "@/hooks/reactQueryHooks/useAdmin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaCrown, FaCheckCircle, FaClock, FaBan } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function WhitelabelStats() {
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

  const { data, isLoading } = useAdminWhitelabels(filters);

  const statsCards = useMemo(() => {
    const whitelabels = data?.data?.whitelabels || data?.data || [];
    const total = data?.data?.pagination?.total || whitelabels.length;
    const active = whitelabels.filter((w) => w.status === "active").length;
    const pending = whitelabels.filter((w) => w.status === "pending").length;
    const suspended = whitelabels.filter((w) => w.status === "suspended").length;

    return [
      {
        src: <FaCrown style={{ color: "#C28E5C", fontSize: "2.4rem" }} />,
        alt: "total-whitelabels",
        title: t("whitelabels.stats.total", "إجمالي العلامات البيضاء"),
        value: total,
        subtitle: t("whitelabels.stats.allTime", "جميع الأوقات"),
      },
      {
        src: <FaCheckCircle style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "active-whitelabels",
        title: t("whitelabels.stats.active", "العلامات النشطة"),
        value: active,
        subtitle: t("whitelabels.stats.activeNow", "نشط الآن"),
      },
      {
        src: <FaClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "pending-whitelabels",
        title: t("whitelabels.stats.pending", "قيد الانتظار"),
        value: pending,
        subtitle: t("whitelabels.stats.awaitingActivation", "في انتظار التفعيل"),
      },
      {
        src: <FaBan style={{ color: "#C0392B", fontSize: "2.4rem" }} />,
        alt: "suspended-whitelabels",
        title: t("whitelabels.stats.suspended", "موقوف"),
        value: suspended,
        subtitle: t("whitelabels.stats.temporarilySuspended", "موقوف مؤقتاً"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
