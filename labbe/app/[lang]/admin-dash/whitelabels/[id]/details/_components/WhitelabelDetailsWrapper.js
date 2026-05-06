"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAdminWhitelabel } from "@/hooks/reactQueryHooks/useAdmin";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { handleError } from "@/services/errorHandlingService";
import FeatureToggle from "@/ui/admin/FeatureToggle";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { FaUsers, FaCalendar, FaShieldAlt, FaCreditCard } from "react-icons/fa";
import WlBrandIdentity from "./WlBrandIdentity";
import WlContactInfo from "./WlContactInfo";
import WlRequirements from "./WlRequirements";
import WlAddress from "./WlAddress";
import WlLicenseTax from "./WlLicenseTax";
import WlPlanSelection from "./WlPlanSelection";
import WlFeatureManagement from "./WlFeatureManagement";
import WlStatsGrid from "./WlStatsGrid";
import styles from "./WhitelabelDetailsWrapper.module.css";

const getStatusConfig = (status, t) => {
  const config = {
    active:    { label: t("status.active", "Active"),    className: styles.statusActive },
    pending:   { label: t("status.pending", "Pending"),  className: styles.statusPending },
    approved:  { label: t("status.approved", "Approved"), className: styles.statusApproved },
    suspended: { label: t("status.suspended", "Suspended"), className: styles.statusSuspended },
    rejected:  { label: t("status.rejected", "Rejected"), className: styles.statusRejected },
  };
  return config[status] || config.pending;
};

const WhitelabelDetailsWrapper = ({ whitelabelId }) => {
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation("adminWhitelabels");
  const { data, isLoading, error } = useAdminWhitelabel(whitelabelId);

  const [features, setFeatures] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  const wl = data?.data?.whitelabel || data?.data || data;
  const wlData = wl?.roleData || wl?.profile?.whitelabelData || {};
  const planSelection = wl?.planSelection || {};

  const fetchFeatures = useCallback(async () => {
    if (!whitelabelId) return;
    try {
      setLoadingFeatures(true);
      const result = await apiRequest({
        method: "GET",
        path: `${API_PATHS.admin.whitelabels.getById(whitelabelId)}/features`,
      });
      setFeatures(result.data?.features || []);
    } catch (err) {
      console.error("Error fetching features:", err);
    } finally {
      setLoadingFeatures(false);
    }
  }, [whitelabelId]);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  const handleFeatureToggle = useCallback(async (featureName, enabled) => {
    try {
      await apiRequest({
        method: "PATCH",
        path: `${API_PATHS.admin.whitelabels.getById(whitelabelId)}/features`,
        data: { feature: featureName, enabled },
      });
      setFeatures((prev) => prev.map((f) => (f.name === featureName ? { ...f, enabled } : f)));
    } catch (err) {
      handleError(err, t, { fallbackMessage: "errors.featureToggleFailed" });
    }
  }, [whitelabelId, t]);

  if (isLoading) return <SimpleLoading />;

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>{t("errors.loadFailed", "Failed to load whitelabel data")}</h2>
          <p>{error.message}</p>
          <button onClick={() => router.back()} className={styles.backBtn}>
            {t("actions.back", "Back")}
          </button>
        </div>
      </div>
    );
  }

  if (!wl) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <p>{t("loading.noData", "No whitelabel data found")}</p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(wl?.status, t);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.push(`/${lang}/admin-dash/whitelabels`)} className={styles.backBtn}>
          {t("actions.backToList", "Back to Whitelabels List")}
        </button>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <div>
              <h1>{wlData?.arabicName || wlData?.englishName || wl?.username || t("defaults.whitelabelName", "Whitelabel")}</h1>
              {wlData?.englishName && wlData?.arabicName && <p className={styles.englishName}>{wlData.englishName}</p>}
            </div>
          </div>
          <div className={styles.statusContainer}>
            <span className={`${styles.statusBadge} ${statusConfig.className}`}>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      <WlStatsGrid wl={wl} t={t} />

      <div className={styles.grid}>
        <WlBrandIdentity wlData={wlData} t={t} />
        <WlContactInfo wl={wl} t={t} />
        <WlRequirements wlData={wlData} t={t} />
        <WlAddress wlData={wlData} t={t} />
        <WlLicenseTax wlData={wlData} t={t} />
        <WlPlanSelection planSelection={planSelection} t={t} />
        <WlFeatureManagement
          features={features}
          loadingFeatures={loadingFeatures}
          onToggle={handleFeatureToggle}
          t={t}
        />
      </div>
    </div>
  );
};

export default WhitelabelDetailsWrapper;
