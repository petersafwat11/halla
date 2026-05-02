"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./cardsWrapper.module.css";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { useEventStats } from "@/hooks/reactQueryHooks/useEvents";

const CardsWrapper = () => {
  const { t } = useTranslation("home-events");
  const { data: statsData, isLoading } = useEventStats();

  // Extract data from response — backend returns { totalGuests, confirmedGuests, checkedInGuests, ... }
  const data = statsData?.data || statsData;

  const totalGuests = data?.totalGuests || 0;
  const confirmedGuests = data?.confirmedGuests || 0;
  const checkedInGuests = data?.checkedInGuests || 0;
  const attendanceRate = totalGuests > 0
    ? Math.round((confirmedGuests / totalGuests) * 100)
    : 0;
  const respondedGuests = confirmedGuests + checkedInGuests;
  const responseRate = totalGuests > 0
    ? Math.round((respondedGuests / totalGuests) * 100)
    : 0;

  // Prepare cards data from API response
  const cards = [
    {
      id: "totalGuests",
      title: t("events.stats.totalGuests") || "إجمالي الضيوف",
      value: totalGuests,
      src: "/svg/stats/events-1.svg",
      alt: "total guests",
    },
    {
      id: "guestAcceptance",
      title: t("events.stats.guestAcceptance") || "قبول الضيوف",
      value: `${attendanceRate}%`,
      src: "/svg/stats/events-2.svg",
      alt: "confirmed guests",
    },
    {
      id: "responseRate",
      title: t("events.stats.responseRate") || "معدل الاستجابة",
      value: `${responseRate}%`,
      src: "/svg/stats/events-3.svg",
      alt: "response rate",
    },
  ];

  return <StatsCards cards={cards} isLoading={isLoading} />;
};

export default CardsWrapper;
