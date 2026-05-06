"use client";

import { useAdminWhitelabels } from "@/hooks/reactQueryHooks/useAdmin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaCrown, FaCheckCircle, FaClock, FaBan } from "react-icons/fa";
import styles from "./WhitelabelStats.module.css";

export default function WhitelabelStats() {
  const { t } = useTranslation("adminWhitelabels");
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => ({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 10,
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    }),
    [searchParams]
  );

  const { data, isLoading } = useAdminWhitelabels(filters);

  const statsCards = useMemo(() => {
    const whitelabels = data?.data?.whitelabels || data?.data || [];
    const total = data?.data?.pagination?.total || whitelabels.length;
    const active = whitelabels.filter((w) => w.status === "active").length;
    const pending = whitelabels.filter((w) => w.status === "pending").length;
    const suspended = whitelabels.filter((w) => w.status === "suspended").length;

    return [
      {
        src: <FaCrown className={styles.iconTotal} />,
        alt: "total-whitelabels",
        title: t("stats.total"),
        value: total,
        subtitle: t("stats.allTime"),
      },
      {
        src: <FaCheckCircle className={styles.iconActive} />,
        alt: "active-whitelabels",
        title: t("stats.active"),
        value: active,
        subtitle: t("stats.activeNow"),
      },
      {
        src: <FaClock className={styles.iconPending} />,
        alt: "pending-whitelabels",
        title: t("stats.pending"),
        value: pending,
        subtitle: t("stats.awaitingActivation"),
      },
      {
        src: <FaBan className={styles.iconSuspended} />,
        alt: "suspended-whitelabels",
        title: t("stats.suspended"),
        value: suspended,
        subtitle: t("stats.temporarilySuspended"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
