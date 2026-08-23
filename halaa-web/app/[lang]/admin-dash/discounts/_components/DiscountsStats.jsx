"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FaGift, FaToggleOn, FaTimes, FaTag } from "react-icons/fa";
import { normalizeDiscountsFilters } from "@/utils/filterNormalizer";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { useDiscounts } from "@/hooks/discounts";

export default function DiscountsStats() {
  const { t } = useTranslation("adminDiscounts");
  const searchParams = useSearchParams();
  const filters = useMemo(() => normalizeDiscountsFilters(searchParams, { limit: 20 }), [searchParams]);

  const { data } = useDiscounts(filters);

  const statsCards = useMemo(() => {
    if (!data) return [];
    const stats = data?.stats || data?.data?.stats;
    const discounts = Array.isArray(data?.data) ? data.data : [];
    const total = stats?.total ?? data?.pagination?.total ?? 0;
    const now = new Date();
    const active = stats?.active !== undefined ? stats.active : discounts.filter((d) => d.isActive).length;
    const expired = stats?.expired !== undefined ? stats.expired : discounts.filter(
      (d) => d.validUntil && new Date(d.validUntil) < now
    ).length;
    const totalUsed = stats?.totalUsed !== undefined ? stats.totalUsed : discounts.reduce((sum, d) => sum + (d.usedCount || 0), 0);

    return [
      {
        title: t("discounts.stats.total", "إجمالي الأكواد"),
        value: total,
        src: <FaGift size={22} color="var(--c-p500, #c28e5c)" />,
        alt: "total",
      },
      {
        title: t("discounts.stats.active", "نشطة"),
        value: active,
        src: <FaToggleOn size={22} color="#2a8c5b" />,
        alt: "active",
      },
      {
        title: t("discounts.stats.expired", "منتهية الصلاحية"),
        value: expired,
        src: <FaTimes size={22} color="#c0392b" />,
        alt: "expired",
      },
      {
        title: t("discounts.stats.uses", "إجمالي الاستخدامات"),
        value: totalUsed,
        src: <FaTag size={22} color="var(--c-s500, #524438)" />,
        alt: "uses",
      },
    ];
  }, [data, t]);

  if (!data) return null;

  return <StatsCards cards={statsCards} />;
}
