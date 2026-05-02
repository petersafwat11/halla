"use client";
import { useTranslation } from "react-i18next";
import {
  FaCheck,
  FaTimes,
  FaCalendarAlt,
  FaHistory,
  FaCreditCard,
  FaChartPie,
} from "react-icons/fa";
import styles from "./SubscriptionDetails.module.css";

const SubscriptionDetails = ({ subscription, usage }) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

  if (!subscription) return null;

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(
      isArabic ? "ar-EG" : "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  };

  // Status Badge Logic
  const getStatusBadge = () => {
    const status = subscription.status;
    const daysRemaining = subscription.daysRemaining;

    if (status === "active") {
      if (daysRemaining <= 3) {
        return (
          <span className={`${styles.statusBadge} ${styles.statusExpiring}`}>
            {t("status.expiring_soon")}
          </span>
        );
      }
      return (
        <span className={`${styles.statusBadge} ${styles.statusActive}`}>
          {t("status.active")}
        </span>
      );
    } else if (status === "trial") {
      return (
        <span className={`${styles.statusBadge} ${styles.statusTrial}`}>
          {t("status.trial")}
        </span>
      );
    } else if (status === "expired" || status === "cancelled") {
      return (
        <span className={`${styles.statusBadge} ${styles.statusExpired}`}>
          {t("status.expired")}
        </span>
      );
    }
    return null;
  };

  // Determine features to list
  const getFeaturesList = () => {
    const features = subscription.features || {};
    const limits = subscription.limits || {};
    
    // Core features to check
    const featureKeys = [
      { key: "hasInAppInvites", label: t("features.inAppInvites") },
      { key: "hasWhatsAppInvites", label: t("features.whatsappInvites") },
      { key: "hasSMSInvites", label: t("features.smsInvites") },
      { key: "hasQRCode", label: t("features.qrCode") },
      { key: "hasStaffCheckIn", label: t("features.staffCheckIn") },
      { key: "hasRSVPTracking", label: t("features.rsvpTracking") },
      { key: "hasAutoReminders", label: t("features.autoReminders") },
    ];

    return featureKeys.map((item) => ({
      label: item.label,
      enabled: !!features[item.key],
    }));
  };

  const featureList = getFeaturesList();

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <FaCreditCard />
          {t("subscriptionDetails.title")}
        </h3>
        {getStatusBadge()}
      </div>

      <div className={styles.grid}>
        {/* Info Column */}
        <div className={styles.infoList}>
          <h4 className={styles.sectionTitle}>
            {t("subscriptionDetails.planInfo")}
          </h4>
          
          <div className={styles.infoItem}>
            <span className={styles.label}>{t("subscriptionDetails.startDate")}</span>
            <span className={styles.value}>{formatDate(subscription.activatedAt)}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.label}>{t("subscriptionDetails.endDate")}</span>
            <span className={styles.value}>{formatDate(subscription.expiresAt)}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.label}>{t("subscriptionDetails.renewalDate")}</span>
            <span className={styles.value}>
               {subscription.cancelAtPeriodEnd
                 ? t("subscriptionDetails.cancelsAtEnd")
                 : formatDate(subscription.expiresAt)}
            </span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.label}>{t("subscriptionDetails.billingCycle")}</span>
            <span className={styles.value}>
              {subscription.expiresAt ? (
                <span>{new Date(subscription.expiresAt).toLocaleDateString()}</span>
              ) : (
                <span>{t('noExpiry') || 'No expiry'}</span>
              )}
            </span>
          </div>
        </div>

        {/* Features Column */}
        <div className={styles.featuresSection}>
          <h4 className={styles.sectionTitle}>
            {t("subscriptionDetails.features")}
          </h4>
          <div className={styles.featuresList}>
            {featureList.map((feature, index) => (
              <div key={index} className={styles.featureItem}>
                {feature.enabled ? (
                  <FaCheck className={styles.checkIcon} />
                ) : (
                  <FaTimes className={styles.xIcon} />
                )}
                <span>{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetails;
