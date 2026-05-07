"use client";
import React, { useState } from "react";
import styles from "./hostCard.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { cookieUtils } from "@/utils/cookieUtils";
import { useRouter, useParams } from "next/navigation";
import adminDashboardAPI from "@/services/adminDashboard";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import SubscriptionPopup from "../subscriptionPopup/SubscriptionPopup";
import {
  FaCrown,
  FaUserSlash,
  FaUserCheck,
} from "react-icons/fa";

const HostCard = ({ data }) => {
  const { t } = useTranslation("adminHosts");
  const router = useRouter();
  const { lang } = useParams();
  const [isSubscriptionPopupOpen, setIsSubscriptionPopupOpen] = useState(false);

  const host = data;
  const subscription = data?.subscription;

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
    return plans[planType] || { color: "#7F8C8D", bg: "#F5F5F5", label: planType || "No Plan" };
  };

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
      inactive: {
        color: "#7F8C8D",
        bg: "#F5F5F5",
        label: t("status.inactive", "غير نشط"),
      },
    };
    return statuses[status] || statuses.active;
  };

  const handleSuspend = async () => {
    const hostId = host?.id || host?._id;
    if (!hostId) {
      toast.error(t("actions.noHostId", "معرف المضيف غير موجود"));
      return;
    }

    const confirmed = window.confirm(
      t("actions.confirmSuspend", "هل أنت متأكد من إيقاف هذا المضيف؟")
    );
    if (!confirmed) return;

    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.hosts.updateStatus(hostId, "suspended", token);
      toast.success(t("actions.suspendSuccess", "تم إيقاف المضيف بنجاح"));
      router.refresh();
    } catch (error) {
      toast.error(t("actions.suspendError", "فشل في إيقاف المضيف"));
    }
  };

  const handleActivate = async () => {
    const hostId = host?.id || host?._id;
    if (!hostId) {
      toast.error(t("actions.noHostId", "معرف المضيف غير موجود"));
      return;
    }

    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.hosts.updateStatus(hostId, "active", token);
      toast.success(t("actions.activateSuccess", "تم تنشيط المضيف بنجاح"));
      router.refresh();
    } catch (error) {
      toast.error(t("actions.activateError", "فشل في تنشيط المضيف"));
    }
  };

  const planBadge = getPlanBadge(subscription?.planId?.planType);
  const statusBadge = getStatusBadge(host?.status);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.profileSection}>
            <Image
              src="/svg/admin/profile.svg"
              alt="profile"
              width={48}
              height={48}
            />
            <div className={styles.headerInfo}>
              <h3 className={styles.title}>{host?.name || host?.username}</h3>
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
            </button>
            {host?.status === "suspended" ? (
              <button
                className={styles.actionButton}
                onClick={handleActivate}
                title={t("actions.activate", "تنشيط")}
              >
                <FaUserCheck style={{ color: "#2A8C5B" }} />
              </button>
            ) : (
              <button
                className={styles.actionButton}
                onClick={handleSuspend}
                title={t("actions.suspend", "إيقاف")}
              >
                <FaUserSlash style={{ color: "#C0392B" }} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.dataGrid}>
          <div className={styles.dataItem}>
            <Image
              src="/svg/admin/call.svg"
              alt={t("hostDetails.phoneNumber")}
              width={24}
              height={24}
            />
            <p className={styles.dataItemText}>
              <span>{t("hostDetails.phoneNumber")}:</span> {host?.phoneNumber}
            </p>
          </div>

          <div className={styles.dataItem}>
            <Image
              src="/svg/admin/email.svg"
              alt={t("hostDetails.email")}
              width={24}
              height={24}
            />
            <p className={styles.dataItemText}>
              <span>{t("hostDetails.email")}:</span> {host?.email || "-"}
            </p>
          </div>

          <div className={styles.dataItem}>
            <Image
              src="/svg/admin/calendar-2.svg"
              alt={t("hostDetails.eventsCount")}
              width={24}
              height={24}
            />
            <p className={styles.dataItemText}>
              <span>{t("hostDetails.eventsCount")}:</span>{" "}
              {data?.events?.length || 0} {t("hostDetails.event")}
            </p>
          </div>
        </div>

        {/* Subscription Info */}
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
                {t("subscription.eventsLimit", "حد المناسبات")}:
              </span>
              <span className={styles.subscriptionValue}>
                {subscription?.limits?.maxEvents || 5}
              </span>
            </div>
            <div className={styles.subscriptionItem}>
              <span className={styles.subscriptionLabel}>
                {t("subscription.guestsLimit", "حد الضيوف")}:
              </span>
              <span className={styles.subscriptionValue}>
                {subscription?.limits?.maxGuestsPerEvent || 50}
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
          </div>
        </div>
      </div>
      <PopupLayout
        isOpen={isSubscriptionPopupOpen}
        onClose={() => setIsSubscriptionPopupOpen(false)}
      >
        <SubscriptionPopup
          host={host}
          currentSubscription={subscription}
          onClose={() => setIsSubscriptionPopupOpen(false)}
          onSuccess={() => {
            setIsSubscriptionPopupOpen(false);
            router.refresh();
          }}
        />
      </PopupLayout>
    </>
  );
};

export default HostCard;
