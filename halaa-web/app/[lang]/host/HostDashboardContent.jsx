"use client";

import { useHostDashboard } from "@/hooks/dashboard";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import styles from "./page.module.css";
import HeroSection from "@/ui/host/main-page/HeroSection";
import StatsCards from "@/ui/host/main-page/StatsCards";
import EventTemplatesSection from "@/ui/host/main-page/EventTemplatesSection";
import LastEventStats from "@/ui/host/main-page/latsEventStats/LastEventStats";
import Button from "@/ui/commen/button/Button";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function HostDashboardContent() {
  const { data, isLoading, error } = useHostDashboard();
  const { t } = useTranslation("home-events");
  const router = useRouter();
  const { lang } = useParams();

  if (isLoading) return <SimpleLoading />;

  if (error) {
    return (
      <div className={styles.error}>
        <p>{t("errors.loadFailed", "Failed to load dashboard")}</p>
      </div>
    );
  }

  const dashData = data?.data;
  const hasEvents = dashData?.hasEvents || false;
  const stats = dashData?.stats || {};

  const cards = [
    {
      id: "totalEvents",
      title: t("stats.totalEvents", "إجمالي المناسبات"),
      value: stats.totalEvents || 0,
      src: "/svg/stats/events-1.svg",
      alt: "total events",
    },
    {
      id: "activeEvents",
      title: t("stats.activeEvents", "المناسبات النشطة"),
      value: stats.activeEvents || 0,
      src: "/svg/stats/events-2.svg",
      alt: "active events",
    },
    {
      id: "pendingSchedulingEvents",
      title: t("stats.pendingSchedulingEvents", "في انتظار الجدولة"),
      value: stats.pendingSchedulingEvents || 0,
      src: "/svg/stats/events-3.svg",
      alt: "pending scheduling events",
    },
    {
      id: "endedEvents",
      title: t("stats.endedEvents", "المناسبات المنتهية"),
      value: stats.endedEvents || 0,
      src: "/svg/stats/events-4.svg",
      alt: "ended events",
    },
  ];

  return (
    <div className={styles.container}>
      {!hasEvents ? (
        <>
          <HeroSection />
          <EventTemplatesSection />
        </>
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.welcomeSection}>
              <h1 className={styles.welcomeTitle}>
                {t("dashboard.welcome")}
              </h1>
              <p className={styles.welcomeSubtitle}>
                {t("dashboard.subtitle")}
              </p>
            </div>
            <Button
              variant="primary"
              title={t("toolbar.createEvent")}
              onClick={() => router.push(`/${lang}/host/create-event`)}
              className={styles.createButton}
            />
          </div>

          <div className={styles.eventsContainer}>
            <StatsCards cards={cards} isLoading={isLoading} />
            <LastEventStats />
          </div>

          <EventTemplatesSection />
        </>
      )}
    </div>
  );
}
