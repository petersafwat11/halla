"use client";
import React, { useState, useCallback } from "react";
import styles from "./whitelabelCard.module.css";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useRouter } from "next/navigation";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import SubscriptionAssignmentPopup from "../../_components/SubscriptionAssignmentPopup";
import {
  FaBuilding,
  FaUsers,
  FaCalendar,
  FaUserTie,
  FaUserSlash,
  FaUserCheck,
  FaCrown,
} from "react-icons/fa";

const STATUS_CSS_MAP = {
  active: styles.statusActive,
  suspended: styles.statusSuspended,
  pending: styles.statusPending,
  inactive: styles.statusInactive,
};

const WhitelabelCard = ({ data }) => {
  const { t } = useTranslation("adminWhitelabels");
  const router = useRouter();
  const [isSubscriptionPopupOpen, setIsSubscriptionPopupOpen] = useState(false);
  const updateStatus = useAdminWhitelabelMutation("updateStatus");

  const whitelabel = data;
  const stats = data?.statistics;
  const subscription = data?.subscription;

  const handleSuspend = useCallback(async () => {
    const confirmed = window.confirm(t("actions.confirmSuspend"));
    if (!confirmed) return;

    try {
      await updateStatus.mutateAsync({
        whitelabelId: whitelabel.id || whitelabel._id,
        status: "suspended",
      });
      toastUtils.success(t("actions.suspendSuccess"));
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "actions.suspendError" });
    }
  }, [whitelabel, updateStatus, t, router]);

  const handleActivate = useCallback(async () => {
    if (!subscription) {
      toastUtils.warning(t("actions.assignPlanFirst"));
      setIsSubscriptionPopupOpen(true);
      return;
    }

    try {
      await updateStatus.mutateAsync({
        whitelabelId: whitelabel.id || whitelabel._id,
        status: "active",
      });
      toastUtils.success(t("actions.activateSuccess"));
      router.refresh();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "actions.activateError" });
    }
  }, [whitelabel, subscription, updateStatus, t, router]);

  const handleClosePopup = useCallback(() => setIsSubscriptionPopupOpen(false), []);
  const handleOpenPopup = useCallback(() => setIsSubscriptionPopupOpen(true), []);

  const handleSubscriptionSuccess = useCallback(() => {
    setIsSubscriptionPopupOpen(false);
    router.refresh();
  }, [router]);

  const statusBadgeLabel = {
    active: t("status.active"),
    suspended: t("status.suspended"),
    pending: t("status.pending"),
    inactive: t("status.inactive"),
  };

  const statusClass = STATUS_CSS_MAP[whitelabel?.status] || styles.statusInactive;

  if (!whitelabel) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>{t("noData")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.profileSection}>
          <div className={styles.logoPlaceholder}>
            <FaBuilding className={styles.logoIcon} />
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
            <span className={`${styles.statusBadge} ${statusClass}`}>
              {statusBadgeLabel[whitelabel?.status] || t("status.inactive")}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={handleOpenPopup}
            title={t("actions.managePlan")}
          >
            <FaCrown className={styles.iconManagePlan} />
            <span>{t("actions.managePlan")}</span>
          </button>
          {whitelabel?.status === "suspended" ||
          whitelabel?.status === "pending" ? (
            <button
              className={styles.actionButton}
              onClick={handleActivate}
              title={t("actions.activate")}
            >
              <FaUserCheck className={styles.iconActivate} />
              <span>{t("actions.activate")}</span>
            </button>
          ) : (
            <button
              className={styles.actionButton}
              onClick={handleSuspend}
              title={t("actions.suspend")}
            >
              <FaUserSlash className={styles.iconSuspend} />
              <span>{t("actions.suspend")}</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.dataGrid}>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>
            {t("details.email")}:
          </span>
          <span className={styles.dataValue}>{whitelabel.email || "-"}</span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>
            {t("details.phone")}:
          </span>
          <span className={styles.dataValue}>
            {whitelabel.phoneNumber || "-"}
          </span>
        </div>
        <div className={styles.dataItem}>
          <span className={styles.dataLabel}>
            {t("details.createdAt")}:
          </span>
          <span className={styles.dataValue}>
            {whitelabel.createdAt
              ? new Date(whitelabel.createdAt).toLocaleDateString()
              : "-"}
          </span>
        </div>
      </div>

      {/* Subscription Section */}
      <div className={styles.subscriptionSection}>
        <h4 className={styles.sectionTitle}>
          {t("subscription.title")}
        </h4>
        <div className={styles.subscriptionGrid}>
          <div className={styles.subscriptionItem}>
            <span className={styles.subscriptionLabel}>
              {t("subscription.plan")}:
            </span>
            <span className={styles.subscriptionValue}>
              {subscription?.planId?.planType || t("subscription.noPlan")}
            </span>
          </div>
          {subscription && (
            <>
              <div className={styles.subscriptionItem}>
                <span className={styles.subscriptionLabel}>
                  {t("subscription.status")}:
                </span>
                <span className={styles.subscriptionValue}>
                  {subscription?.status === "active"
                    ? t("subscription.active")
                    : subscription?.status === "trial"
                    ? t("subscription.trial")
                    : t("subscription.inactive")}
                </span>
              </div>
              <div className={styles.subscriptionItem}>
                <span className={styles.subscriptionLabel}>
                  {t("subscription.teamLimit")}:
                </span>
                <span className={styles.subscriptionValue}>
                  {subscription?.limits?.maxUsers === -1
                    ? t("subscription.unlimited")
                    : subscription?.limits?.maxUsers || 1}
                </span>
              </div>
              <div className={styles.subscriptionItem}>
                <span className={styles.subscriptionLabel}>
                  {t("subscription.eventsLimit")}:
                </span>
                <span className={styles.subscriptionValue}>
                  {subscription?.limits?.maxEvents === -1
                    ? t("subscription.unlimited")
                    : subscription?.limits?.maxEvents ?? 0}
                </span>
              </div>
              {subscription?.expiresAt && (
                <div className={styles.subscriptionItem}>
                  <span className={styles.subscriptionLabel}>
                    {t("subscription.expiresAt")}:
                  </span>
                  <span className={styles.subscriptionValue}>
                    {new Date(subscription.expiresAt).toLocaleDateString()}
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
          {t("stats.title")}
        </h4>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <FaUsers className={styles.statIconHosts} />
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stats?.hostsCount || 0}</span>
              <span className={styles.statLabel}>
                {t("stats.hosts")}
              </span>
            </div>
          </div>
          <div className={styles.statCard}>
            <FaCalendar className={styles.statIconEvents} />
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {stats?.eventsCount || 0}
              </span>
              <span className={styles.statLabel}>
                {t("stats.events")}
              </span>
            </div>
          </div>
          <div className={styles.statCard}>
            <FaUserTie className={styles.statIconModerators} />
            <div className={styles.statInfo}>
              <span className={styles.statValue}>
                {stats?.moderatorsCount || 0}
              </span>
              <span className={styles.statLabel}>
                {t("stats.moderators")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Popup */}
      {isSubscriptionPopupOpen && (
        <SubscriptionAssignmentPopup
          entity={whitelabel}
          entityType="whitelabel"
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default WhitelabelCard;
