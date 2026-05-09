"use client";

import { useTemplateCategories } from "@/hooks/queries/useTemplates";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaLayerGroup, FaCheckCircle, FaBan } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function CategoriesStats() {
  const { t } = useTranslation("admin");
  const { data, isLoading, error } = useTemplateCategories({ admin: true });

  const statsCards = useMemo(() => {
    const cats = data?.data?.categories || [];
    const total = cats.length;
    const active = cats.filter((c) => c.active !== false).length;
    const inactive = total - active;

    return [
      {
        src: <FaLayerGroup style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "total-categories",
        title: t("templates.categories.stats.total", "إجمالي الفئات"),
        value: total,
        subtitle: t("templates.categories.stats.allTime", "جميع الفئات"),
      },
      {
        src: <FaCheckCircle style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
        alt: "active-categories",
        title: t("templates.categories.stats.active", "الفئات النشطة"),
        value: active,
        subtitle: t("templates.categories.stats.activeNow", "نشطة الآن"),
      },
      {
        src: <FaBan style={{ color: "#C0392B", fontSize: "2.4rem" }} />,
        alt: "inactive-categories",
        title: t("templates.categories.stats.inactive", "الفئات غير النشطة"),
        value: inactive,
        subtitle: t("templates.categories.stats.inactiveSubtitle", "معطلة مؤقتاً"),
      },
    ];
  }, [data, t]);

  if (isLoading) return <SimpleLoading />;
  if (error) {
    return (
      <p style={{ color: "#C0392B", fontSize: "1.4rem" }}>
        {t("templates.categories.stats.error", "تعذر تحميل إحصاءات الفئات")}
      </p>
    );
  }

  return <StatsCards cards={statsCards} />;
}
