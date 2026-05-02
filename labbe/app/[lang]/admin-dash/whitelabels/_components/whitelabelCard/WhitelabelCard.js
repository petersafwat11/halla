"use client";
import React, { useState } from "react";
import styles from "./whitelabelCard.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { cookieUtils } from "@/utils/cookieUtils";
import { useRouter } from "next/navigation";
import adminDashboardAPI from "@/services/adminDashboard";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import WhitelabelSubscriptionPopup from "../whitelabelSubscriptionPopup/WhitelabelSubscriptionPopup";
import {
  FaBuilding,
  FaUsers,
  FaCalendar,
  FaUserTie,
  FaUserSlash,
  FaUserCheck,
  FaCrown,
} from "react-icons/fa";

const WhitelabelCard = ({ data }) => {
  const { t } = useTranslation("adminWhitelabels");
  const router = useRouter();
  const [isSubscriptionPopupOpen, setIsSubscriptionPopupOpen] = useState(false);

  const whitelabel = data;
  const stats = data?.statistics;
  const subscription = data?.subscription;

  const getStatusBadge = (status) => {
    const statuses = {
      active: {
        color: "#2A8C5B",
        bg: "#EAF4EF",
        label: t("status.active", "نشط"),
      },
      suspended: {
        color: "#C0392B",
        bg: "#F9EBEA",
        label: t("status.suspended", "موقوف"),
      },
      pending: {
        color: "#D38200",
        bg: "#FBF3E6",
        label: t("status.pending", "قيد المراجعة"),
      },
      inactive: {
        color: "#7F8C8D",
        bg: "#F5F5F5",
        label: t("status.inactive", "غير نشط"),
      },
    };
    return statuses[status] || statuses.inactive;
  };

  const handleSuspend = async () => {
    const confirmed = window.confirm(
      t("actions.confirmSuspend", "هل أنت متأكد من إيقاف هذا الوايت ليبل؟")
    );
    if (!confirmed) return;

    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.whitelabel.updateStatus(
        whitelabel.id || whitelabel._id,
        "suspended",
        token
      );
      toast.success(t("actions.suspendSuccess", "تم إيقاف الوايت ليبل بنجاح"));
      router.refresh();
    } catch (error) {
      console.error("Error suspending whitelabel:", error);
      toast.error(t("actions.suspendError", "فشل في إيقاف الوايت ليبل"));
    }
  };

  const handleActivate = async () => {
    // Check if subscription is assigned before activating
    if (!subscription) {
      toast.warning(
        t(
          "actions.assignPlanFirst",
          "يجب تعيين خطة اشتراك قبل تنشيط الوايت ليبل"
        )
      );
      setIsSubscriptionPopupOpen(true);
      return;
    }

    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.whitelabel.updateStatus(
        whitelabel.id || whitelabel._id,
        "active",
        token
      );
      toast.success(t("actions.activateSuccess", "تم تنشيط الوايت ليبل بنجاح"));
      router.refresh();
    } catch (error) {
      console.error("Error activating whitelabel:", error);
      toast.error(t("actions.activateError", "فشل في تنشيط الوايت ليبل"));
    }
  };

  const statusBadge = getStatusBadge(whitelabel?.status);

  const getPlanBadge = (planType) => {
    const plans = {
      trial: { color: "#7F8C8D", bg: "#F5F5F5", label: "Trial" },
      basic_event: { color: "#3498DB", bg: "#E8F4FD", label: "Basic Event" },
      basic_monthly: { color: "#3498DB", bg: "#E8F4FD", label: "Basic Monthly" },
      premium_event: { color: "#9B59B6", bg: "#F5EEF8", label: "Premium Event" },
      premium_monthly: { color: "#9B59B6", bg: "#F5EEF8", label: "Premium Monthly" },
      business_event: { color: "#F39C12", bg: "#FEF5E7", label: "Business Event" },
      business_quarterly: { color: "#F39C12", bg: "#FEF5E7", label: "Business Quarterly" },
      business_annual: { color: "#F39C12", bg: "#FEF5E7", label: "Business Annual" },
      unlimited: { color: "#2ECC71", bg: "#EAFAF1", label: "Unlimited" },
    };
    return (
      plans[planType] || {
        color: "#7F8C8D",
        bg: "#F5F5F5",
        label: t("subscription.noPlan", "لا يوجد"),
      }
    );
  };

  const planBadge = getPlanBadge(subscription?.planId?.planType);

  if (!whitelabel) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>{t("noData", "لا توجد بيانات")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.profileSection}>
          <div className={styles.logoPlaceholder}>
            <FaBuilding size={32} color="#C28E5C" />
          </div>
          <div className={styles.headerInfo}>
            <h3 className={styles.title}>
              {whitelabel.profile?.whitelabelData?.arabicName ||
                whitelabel.username}
            </h3>
            {whitelabel.profile?.whitelabelData?.englishName && (
              <p className={styles.subtitle}>
                {whitelabel.profile.whitelabelData.englishName}
              </p>
            )}
            <span
              className={styles.statusBadge}
              style={{ color: statusBadge.color, background: statusBadge.bg }}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => setIsSubscriptionPopupOpen(true)}
            title={t("actions.managePlan", "إدارة الاشتراك")}
          >
            <FaCrown style={{ color: "#F39C12" }} />
            <span>{t("actions.managePlan", "إدارة الاشتراك")}</span>
          </button>
          {whitelabel?.status === "suspended" ||
          whitelabel?.status === "pending" ? (
            <button
              className={styles.actionButton}
              onClick={handleActivate}
              title={t("actions.activate", "تنشيط")}
            >
              <FaUserCheck style={{ color: "#2A8C5B" }} />
              <span>{t("actions.activate", "تنشيط")}</span>
            </button>
          ) : (
            <button
              className={styles.actionButton}
              onClick={handleSuspend}
              title={t("actions.suspend", "إيقاف")}
            >
              <FaUserSlash style={{ color: "#C0392B" }} />
              <span>{t("actions.suspend", "إيقاف")}</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.dataGrid}>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>
            {t("details.email", "البريد الإلكتروني")}:
          </span>
          <span className={styles.dataValue}>{whitelabel.email || "-"}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>
            {t("details.phone", "رقم الهاتف")}:
          </span>
          <span className={styles.dataValue}>
            {whitelabel.phoneNumber || "-"}
          </span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>
            {t("details.createdAt", "تاريخ التسجيل")}:
          </span>
          <span className={styles.dataValue}>
            {whitelabel.createdAt
              ? new Date(whitelabel.createdAt).toLocaleDateString("ar-EG")
              : "-"}
          </span>
        </div>
      </div>

      {/* Subscription Section */}
      <div className={styles.subscriptionSection}>
        <h4 className={styles.sectionTitle}>
          {t("subscription.title", "معلومات الاشتراك")}
        </h4>
        <div className={styles.subscriptionGrid}>
          <div className={styles.subscriptionItem}>
            <span className={styles.subscriptionLabel}>
              {t("subscription.plan", "الخطة")}:
            </span>
            <span
              className={styles.planBadge}
              style={{ color: planBadge.color, background: planBadge.bg }}
            >
              {planBadge.label}
            </span>
          </div>
          {subscription && (
            <>
              <div className={styles.subscriptionItem}>
                <span className={styles.subscriptionLabel}>
                  {t("subscription.status", "حالة الاشتراك")}:
                </span>
                <span className={styles.subscriptionValue}>
                  {subscription?.status === "active"
                    ? t("subscription.active", "نشط")
                    : subscription?.status === "trial"
                    ? t("subscription.trial", "تجريبي")
                    : t("subscription.inactive", "غير نشط")}
                </span>
              </div>
              <div className={styles.subscriptionItem}>
                <span className={styles.subscriptionLabel}>
                  {t("subscription.teamLimit", "حد أعضاء الفريق")}:
                </span>
                <span className={styles.subscriptionValue}>
                  {subscription?.limits?.maxUsers === -1
                    ? t("subscription.unlimited", "غير محدود")
                    : subscription?.limits?.maxUsers || 1}
                </span>
              </div>
              <div className={styles.subscriptionItem}>
                <span className={styles.subscriptionLabel}>
                  {t("subscription.eventsLimit", "حد المناسبات")}:
                </span>
                <span className={styles.subscriptionValue}>
                  {subscription?.limits?.maxEventsPerMonth === -1
                    ? t("subscription.unlimited", "غير محدود")
                    : subscription?.limits?.maxEventsPerMonth || 5}
                </span>
              </div>
              {subscription?.expiresAt && (
                <div className={styles.subscriptionItem}>
                  <span className={styles.subscriptionLabel}>
                    {t("subscription.expiresAt", "ينتهي في")}:
                  </span>
                  <span className={styles.subscriptionValue}>
                    {new Date(subscription.expiresAt).toLocaleDateString(
                      "ar-EG"
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className={styles.statsSection}>
        <h4 className={styles.sectionTitle}>
          {t("stats.title", "الإحصائيات")}
        </h4>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <FaUsers className={styles.statIcon} style={{ color: "#3498DB" }} />
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats?.hostsCount || 0}</span>
              <span className={styles.statLabel}>
                {t("stats.hosts", "المضيفين")}
              </span>
            </div>
          </div>
          <div className={styles.statCard}>
            <FaCalendar
              className={styles.statIcon}
              style={{ color: "#E67E22" }}
            />
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {stats?.eventsCount || 0}
              </span>
              <span className={styles.statLabel}>
                {t("stats.events", "المناسبات")}
              </span>
            </div>
          </div>
          <div className={styles.statCard}>
            <FaUserTie
              className={styles.statIcon}
              style={{ color: "#1ABC9C" }}
            />
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {stats?.moderatorsCount || 0}
              </span>
              <span className={styles.statLabel}>
                {t("stats.moderators", "المشرفين")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Popup */}
      <PopupLayout
        isOpen={isSubscriptionPopupOpen}
        onClose={() => setIsSubscriptionPopupOpen(false)}
      >
        <WhitelabelSubscriptionPopup
          whitelabel={whitelabel}
          currentSubscription={subscription}
          onClose={() => setIsSubscriptionPopupOpen(false)}
          onSuccess={() => {
            setIsSubscriptionPopupOpen(false);
            router.refresh();
          }}
        />
      </PopupLayout>
    </div>
  );
};

export default WhitelabelCard;
