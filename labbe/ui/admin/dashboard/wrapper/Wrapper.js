"use client";
import React, { useState, useEffect, useMemo } from "react";
import { cookieUtils } from "@/utils/cookieUtils";
import Header from "@/ui/admin/header/Header";
import StatsCards from "@/ui/host/main-page/StatsCards";
import Table from "@/ui/commen/new-table/Table";
import styles from "./wrapper.module.css";
import { useTranslation } from "react-i18next";
import adminDashboardAPI from "@/services/adminDashboard";
import { useRouter } from "next/navigation";
import {
  FaUsers,
  FaStore,
  FaCalendarAlt,
  FaUserCheck,
  FaCrown,
} from "react-icons/fa";
import Actions from "@/ui/admin/dashboard/actions/Actions";
import Bottom from "@/ui/admin/dashboard/bottom/Bottom";
import CustomPieChart from "@/ui/admin/dashboard/charts/customPieChart/CustomPieChart";
import PieChartComponent from "@/ui/admin/dashboard/charts/pieChart/PieChart";

const Wrapper = ({ data }) => {
  const router = useRouter();
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [filteredData, setFilteredData] = useState(data || {});
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    setFilteredData(data || {});
  }, [data]);

  useEffect(() => {
    const userData = cookieUtils.getCookie("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const { t } = useTranslation("adminDashboard");

  // Check if user is a whitelabel admin
  const isWhitelabelAdmin = user?.role === "whitelabel_admin";

  // Map data from API response structure
  const hostsData = data?.users?.hosts || data?.hosts || {};
  const vendorsData = data?.users?.vendors || data?.vendors || {};
  const eventsData = data?.events || {};
  const ticketsData = data?.tickets || {};
  const revenueData = data?.revenue || {};
  const subscriptionData = data?.subscription || user?.subscription || null;

  // Build stats cards based on user role
  const statsCards = useMemo(() => {
    if (isWhitelabelAdmin) {
      // Whitelabel-specific stats
      return [
        {
          src: <FaUsers style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
          alt: "total-hosts",
          title: t("stats.totalHosts", "إجمالي العملاء"),
          value: hostsData?.total || hostsData?.totalHosts || 0,
          subtitle: `${hostsData?.newThisPeriod || 0} ${t(
            "stats.newThisPeriod",
            "جديد هذا الشهر",
          )}`,
        },
        {
          src: (
            <FaCalendarAlt style={{ color: "#3498DB", fontSize: "2.4rem" }} />
          ),
          alt: "active-events",
          title: t("stats.activeEvents", "المناسبات النشطة"),
          value: eventsData?.active || eventsData?.endedPublishedEvents || 0,
          subtitle: `${eventsData?.total || 0} ${t(
            "stats.totalEvents",
            "إجمالي",
          )}`,
        },
        {
          src: <FaCrown style={{ color: "#C28E5C", fontSize: "2.4rem" }} />,
          alt: "subscription-status",
          title: t("stats.subscriptionStatus", "حالة الاشتراك"),
          value:
            subscriptionData?.status === "active"
              ? t("stats.active", "نشط")
              : t("stats.inactive", "غير نشط"),
          subtitle:
            subscriptionData?.plan?.name ||
            subscriptionData?.planCode ||
            t("stats.noPlan", "لا يوجد خطة"),
          highlight:
            subscriptionData?.status === "active" ? "success" : "warning",
        },
        {
          src: <FaUserCheck style={{ color: "#9B59B6", fontSize: "2.4rem" }} />,
          alt: "moderators",
          title: t("stats.moderators", "المشرفين"),
          value: data?.moderators?.total || 0,
          subtitle: `${data?.moderators?.active || 0} ${t(
            "stats.activeModerators",
            "نشط",
          )}`,
        },
      ];
    }

    // Default admin stats
    return [
      {
        src: <FaUsers style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "total-hosts",
        title: t("stats.totalHosts", "إجمالي العملاء"),
        value: hostsData?.total || hostsData?.totalHosts || 0,
        subtitle: `${hostsData?.newThisPeriod || 0} ${t(
          "stats.newThisPeriod",
          "جديد هذا الشهر",
        )}`,
      },
      {
        src: <FaStore style={{ color: "#C28E5C", fontSize: "2.4rem" }} />,
        alt: "active-vendors",
        title: t("stats.activeVendors", "التجار النشطين"),
        value: vendorsData?.total || vendorsData?.totalVendors || 0,
        subtitle: `${
          vendorsData?.pending || vendorsData?.totalPending || 0
        } ${t("stats.pending", "قيد المراجعة")}`,
      },
      {
        src: <FaCalendarAlt style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
        alt: "active-events",
        title: t("stats.activeEvents", "المناسبات النشطة"),
        value: eventsData?.active || eventsData?.endedPublishedEvents || 0,
        subtitle: `${eventsData?.total || 0} ${t(
          "stats.totalEvents",
          "إجمالي",
        )}`,
      },
      {
        src: <FaUserCheck style={{ color: "#9B59B6", fontSize: "2.4rem" }} />,
        alt: "open-tickets",
        title: t("stats.openTickets", "الشكاوى المفتوحة"),
        value: ticketsData?.open || ticketsData?.allTickets || 0,
        subtitle: `${
          ticketsData?.resolvedThisPeriod || ticketsData?.resolved || 0
        } ${t("stats.resolved", "محلولة")}`,
      },
    ];
  }, [
    isWhitelabelAdmin,
    hostsData,
    vendorsData,
    eventsData,
    ticketsData,
    subscriptionData,
    data?.moderators,
    t,
  ]);

  // Build client-side search filter over all keys in each transaction object
  const searchedTransactions = useMemo(() => {
    const transactions = filteredData?.transactions || [];
    const term = search.trim().toLowerCase();
    if (!term) return transactions;
    return transactions.filter((transaction) => {
      return Object.values(transaction).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [filteredData, search]);

  // When date range changes, refetch data from backend with from/to
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (typeof window === "undefined") return; // Skip on server side
        const token = cookieUtils.getCookie("token");
        const filters = {};
        if (selectedDateRange?.from && selectedDateRange?.to) {
          filters.from = selectedDateRange.from.toISOString();
          filters.to = selectedDateRange.to.toISOString();
        }
        const response = await adminDashboardAPI.dashboard.getStats(
          "month",
          token,
          filters,
        );
        if (response?.data) {
          setFilteredData(response.data);
        }
      } catch (err) {
        console.error("Failed to refetch dashboard data:", err?.message);
      }
    };

    fetchData();
  }, [selectedDateRange?.from, selectedDateRange?.to, data]);
  console.log("data", data);
  return (
    <div>
      <div className={styles.top}>
        <Header
          selectedDateRange={selectedDateRange}
          setSelectedDateRange={setSelectedDateRange}
          title={t("header.welcome", { name: user?.username || "" })}
          subtitle={t("header.subtitle")}
          actions={<Actions />}
        />
      </div>
      <div className={styles.stats}>
        <StatsCards cards={statsCards} />
        <div className="charts-grid">
          <div className="chart-box">
            <CustomPieChart data={eventsData?.guestStats} />
          </div>
          <div className="chart-box">
            <PieChartComponent
              data={revenueData}
              type="revenue"
              title={t("charts.revenue")}
            />
          </div>
          {/* Only show tickets chart for non-whitelabel admins */}
          {!isWhitelabelAdmin && (
            <div className="chart-box">
              <PieChartComponent
                data={{
                  resolved:
                    ticketsData?.resolvedThisPeriod ||
                    ticketsData?.resolved ||
                    0,
                  allTickets:
                    (ticketsData?.open || 0) +
                    (ticketsData?.resolvedThisPeriod || 0),
                  totalPending:
                    ticketsData?.open || ticketsData?.totalPending || 0,
                }}
                type="tickets"
                title={t("charts.tickets")}
              />
            </div>
          )}
        </div>
      </div>
      <div className={styles.tablesAndBottom}>
        <div className={styles.tables}>
          <Table
            title={t("tables.recentHosts.title", "العملاء الجدد")}
            headers={[
              t("tables.recentHosts.columns.name", "الاسم"),
              t("tables.recentHosts.columns.email", "البريد الإلكتروني"),
              t("tables.recentHosts.columns.status", "الحالة"),
              t("tables.recentHosts.columns.createdAt", "التاريخ"),
            ]}
            data={(data?.recentActivity?.hosts || []).map((host) => ({
              id: host._id || host.id,
              name: host.username || host.name || "-",
              email: host.email || "-",
              status: host.status || "active",
              createdAt:
                host.createdAt || host.created_at || new Date().toISOString(),
            }))}
            renderCell={(key, value) => {
              if (key === "status") {
                const statusConfig = {
                  active: {
                    bg: "#EAF4EF",
                    color: "#2A8C5B",
                    text: t("tables.recentHosts.status.active", "نشط"),
                  },
                  pending: {
                    bg: "#FBF3E6",
                    color: "#D38200",
                    text: t(
                      "tables.recentHosts.status.pending",
                      "قيد الانتظار",
                    ),
                  },
                  suspended: {
                    bg: "#F9EBEA",
                    color: "#C0392B",
                    text: t("tables.recentHosts.status.suspended", "موقوف"),
                  },
                };
                const config = statusConfig[value] || statusConfig.active;
                return (
                  <div
                    style={{
                      display: "inline-flex",
                      padding: "0.3rem 1.2rem",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: "9999px",
                      background: config.bg,
                    }}
                  >
                    <span
                      style={{
                        color: config.color,
                        fontFamily: "Cairo",
                        fontSize: "1.2rem",
                      }}
                    >
                      {config.text}
                    </span>
                  </div>
                );
              }
              if (key === "createdAt" && value) {
                const date = new Date(value);
                const arabicMonths = [
                  "يناير",
                  "فبراير",
                  "مارس",
                  "أبريل",
                  "مايو",
                  "يونيو",
                  "يوليو",
                  "أغسطس",
                  "سبتمبر",
                  "أكتوبر",
                  "نوفمبر",
                  "ديسمبر",
                ];
                return `${date.getDate()} ${
                  arabicMonths[date.getMonth()]
                } ${date.getFullYear()}`;
              }
              return value;
            }}
            showSearch={false}
            showFilter={false}
            showExport={false}
            showCheckboxes={false}
          />
          <Table
            title={t("tables.recentEvents.title", "المناسبات الأخيرة")}
            headers={[
              t("tables.recentEvents.columns.title", "العنوان"),
              t("tables.recentEvents.columns.host", "المضيف"),
              t("tables.recentEvents.columns.date", "التاريخ"),
              t("tables.recentEvents.columns.status", "الحالة"),
            ]}
            data={(data?.recentActivity?.events || []).map((event) => ({
              id: event.id || event._id,
              title: event.title || "-",
              host: event.host || "-",
              date: event.date,
              status: event.status || "draft",
            }))}
            renderCell={(key, value) => {
              if (key === "status") {
                const statusConfig = {
                  scheduled: {
                    bg: "#E8F4FD",
                    color: "#3498DB",
                    text: t("tables.recentEvents.status.scheduled", "مجدول"),
                  },
                  live: {
                    bg: "#EAF4EF",
                    color: "#2A8C5B",
                    text: t("tables.recentEvents.status.live", "مباشر"),
                  },
                  completed: {
                    bg: "#F5F5F5",
                    color: "#666666",
                    text: t("tables.recentEvents.status.completed", "منتهي"),
                  },
                  draft: {
                    bg: "#FBF3E6",
                    color: "#D38200",
                    text: t("tables.recentEvents.status.draft", "مسودة"),
                  },
                };
                const config = statusConfig[value] || statusConfig.draft;
                return (
                  <div
                    style={{
                      display: "inline-flex",
                      padding: "0.3rem 1.2rem",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: "9999px",
                      background: config.bg,
                    }}
                  >
                    <span
                      style={{
                        color: config.color,
                        fontFamily: "Cairo",
                        fontSize: "1.2rem",
                      }}
                    >
                      {config.text}
                    </span>
                  </div>
                );
              }
              if (key === "date" && value) {
                const date = new Date(value);
                const arabicMonths = [
                  "يناير",
                  "فبراير",
                  "مارس",
                  "أبريل",
                  "مايو",
                  "يونيو",
                  "يوليو",
                  "أغسطس",
                  "سبتمبر",
                  "أكتوبر",
                  "نوفمبر",
                  "ديسمبر",
                ];
                return `${date.getDate()} ${
                  arabicMonths[date.getMonth()]
                } ${date.getFullYear()}`;
              }
              return value;
            }}
            showSearch={false}
            showFilter={false}
            showExport={false}
            showCheckboxes={false}
          />
        </div>
        {/* Only show Bottom section (best vendors) for non-whitelabel admins */}
        {!isWhitelabelAdmin && (
          <Bottom
            bestVendors={data?.bestVendors}
            lastEvents={data?.recentActivity?.events}
          />
        )}
      </div>
    </div>
  );
};

export default Wrapper;
