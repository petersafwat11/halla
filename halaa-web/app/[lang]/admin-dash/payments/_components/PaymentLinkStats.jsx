"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAdminPaymentLinks } from "@/hooks/admin";
import { normalizePaymentLinksFilters } from "@/utils/filterNormalizer";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaClock, FaCheckCircle, FaMoneyBillWave } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import MoneyAmount from "@/ui/commen/MoneyAmount/MoneyAmount";

export default function PaymentLinkStats() {
  const { t, i18n } = useTranslation("adminPayments");
  const isArabic = i18n.language === "ar";
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => normalizePaymentLinksFilters(searchParams, { limit: 20 }),
    [searchParams]
  );
  const { data, isLoading } = useAdminPaymentLinks(filters);
  const summary = useMemo(() => data?.data?.summary || {}, [data]);

  const cards = useMemo(
    () => [
      {
        src: <FaClock style={{ color: "var(--color-warning-500)", fontSize: "2.4rem" }} />,
        alt: "awaiting",
        title: t("links.stats.awaiting", "Awaiting payment"),
        value: summary.awaiting ?? 0,
        subtitle: t("links.filters.dateHint", "By request creation date"),
      },
      {
        src: <FaCheckCircle style={{ color: "var(--color-success-500)", fontSize: "2.4rem" }} />,
        alt: "paid",
        title: t("links.stats.paid", "Paid"),
        value: summary.paid ?? 0,
        subtitle: t("links.filters.dateHint", "By request creation date"),
      },
      {
        src: <FaMoneyBillWave style={{ color: "var(--color-primary-500)", fontSize: "2.4rem" }} />,
        alt: "net",
        title: t("links.stats.netCollected", "Net collected (SAR)"),
        value: (
          <MoneyAmount
            amount={Number(summary.netCollectedSar || 0)}
            currency="SAR"
            locale={isArabic ? "ar" : "en"}
          />
        ),
        subtitle: t("links.filters.dateHint", "By request creation date"),
      },
    ],
    [summary, t, isArabic]
  );

  if (isLoading) return <SimpleLoading />;
  return <StatsCards cards={cards} />;
}
