"use client";

import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useAdminTaqnyatTemplates } from "@/hooks/queries/useTaqnyatTemplates";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaLayerGroup, FaCheckCircle, FaClock, FaToggleOn } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function TaqnyatTemplatesStats() {
  const { t } = useTranslation("admin");
  const { data, isLoading } = useAdminTaqnyatTemplates();

  const templates = data?.data?.templates || data?.templates || [];

  const statsCards = useMemo(() => {
    const total = templates.length;
    const approved = templates.filter((tpl) => tpl.status === "APPROVED").length;
    const pending = templates.filter((tpl) => tpl.status !== "APPROVED").length;
    const active = templates.filter((tpl) => tpl.active !== false).length;

    return [
      {
        src: <FaLayerGroup style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "total-templates",
        title: t("taqnyat.stats.total", "إجمالي القوالب"),
        value: total,
        subtitle: t("taqnyat.stats.allTemplates", "جميع القوالب"),
      },
      {
        src: <FaCheckCircle style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
        alt: "approved-templates",
        title: t("taqnyat.stats.approved", "المعتمدة"),
        value: approved,
        subtitle: t("taqnyat.stats.approvedByMeta", "معتمدة من Meta"),
      },
      {
        src: <FaClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "pending-templates",
        title: t("taqnyat.stats.pending", "قيد الانتظار"),
        value: pending,
        subtitle: t("taqnyat.stats.awaitingApproval", "في انتظار الموافقة"),
      },
      {
        src: <FaToggleOn style={{ color: "#8E44AD", fontSize: "2.4rem" }} />,
        alt: "active-templates",
        title: t("taqnyat.stats.active", "النشطة"),
        value: active,
        subtitle: t("taqnyat.stats.readyToSend", "جاهزة للإرسال"),
      },
    ];
  }, [templates, t]);

  if (isLoading) return <SimpleLoading />;

  return <StatsCards cards={statsCards} />;
}
