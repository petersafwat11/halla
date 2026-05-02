"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import FeatureToggle from "@/ui/admin/FeatureToggle";
import styles from "./WhitelabelDetailsWrapper.module.css";

const WhitelabelDetailsWrapper = ({ whitelabelData, error }) => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [features, setFeatures] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  // Get whitelabel data from nested response structure
  // API returns: { whitelabel, planSelection }
  const whitelabel = whitelabelData?.whitelabel || whitelabelData;
  const planSelection =
    whitelabelData?.planSelection || whitelabel?.planSelection || {};

  // WhiteLabel data is in roleData (toPublicJSON moves profile.whitelabelData to roleData)
  const wlData =
    whitelabel?.roleData || whitelabel?.profile?.whitelabelData || {};

  // Fetch features on component mount
  React.useEffect(() => {
    const fetchFeatures = async () => {
      if (!whitelabel?.id && !whitelabel?._id) return;

      try {
        setLoadingFeatures(true);
        const API_BASE =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";
        const response = await fetch(
          `${API_BASE}/admin/whitelabels/${whitelabel.id || whitelabel._id}/features`,
          {
            credentials: "include",
          },
        );

        if (response.ok) {
          const result = await response.json();
          setFeatures(result.data?.features || []);
        }
      } catch (err) {
        console.error("Error fetching features:", err);
      } finally {
        setLoadingFeatures(false);
      }
    };

    fetchFeatures();
  }, [whitelabel?.id, whitelabel?._id]);

  // Handle feature toggle
  const handleFeatureToggle = async (featureName, enabled) => {
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";
      const response = await fetch(
        `${API_BASE}/admin/whitelabels/${whitelabel._id}/features`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ feature: featureName, enabled }),
        },
      );

      if (response.ok) {
        // Update local state
        setFeatures((prev) =>
          prev.map((f) => (f.name === featureName ? { ...f, enabled } : f)),
        );
      } else {
        throw new Error("Failed to update feature");
      }
    } catch (err) {
      console.error("Error toggling feature:", err);
      alert("فشل في تحديث الميزة. يرجى المحاولة مرة أخرى.");
    }
  };

  // Status display
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        label: t("status.active", "Active"),
        className: styles.statusActive,
      },
      pending: {
        label: t("status.underReview", "Under Review"),
        className: styles.statusPending,
      },
      approved: {
        label: t("status.approved", "Approved"),
        className: styles.statusApproved,
      },
      suspended: {
        label: t("status.suspended", "Suspended"),
        className: styles.statusSuspended,
      },
      rejected: {
        label: t("status.rejected", "Rejected"),
        className: styles.statusRejected,
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`${styles.statusBadge} ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>خطأ في تحميل بيانات العلامة البيضاء</h2>
          <p>{error}</p>
          <button onClick={() => router.back()} className={styles.backBtn}>
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (!whitelabelData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <p>جاري تحميل بيانات العلامة البيضاء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ← العودة إلى قائمة العلامات البيضاء
        </button>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <div>
              <h1>
                {wlData?.arabicName ||
                  wlData?.englishName ||
                  whitelabel?.username ||
                  "علامة بيضاء"}
              </h1>
              {wlData?.englishName && wlData?.arabicName && (
                <p className={styles.englishName}>{wlData.englishName}</p>
              )}
            </div>
          </div>
          <div className={styles.statusContainer}>
            {getStatusBadge(whitelabel?.status)}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.grid}>
        {/* Brand Identity Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🏢</span>
            الهوية التجارية
          </h2>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <span className={styles.label}>الاسم بالعربية</span>
              <span className={styles.value}>{wlData?.arabicName || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>الاسم بالإنجليزية</span>
              <span className={styles.value}>{wlData?.englishName || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>اسم الشركة</span>
              <span className={styles.value}>{wlData?.companyName || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>اسم المنصة</span>
              <span className={styles.value}>
                {wlData?.platformName || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Info Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📧</span>
            معلومات التواصل
          </h2>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <span className={styles.label}>البريد الإلكتروني</span>
              <span className={styles.value}>{whitelabel?.email || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>رقم الهاتف</span>
              <span className={styles.value} dir="ltr">
                {whitelabel?.phoneNumber || "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>اسم المستخدم</span>
              <span className={styles.value}>
                {whitelabel?.username || "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>تاريخ التسجيل</span>
              <span className={styles.value}>
                {formatDate(whitelabel?.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Requirements Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📋</span>
            متطلبات النظام
          </h2>
          <div className={styles.cardContent}>
            {wlData?.requirements ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.label}>عدد الفعاليات الشهرية</span>
                  <span className={styles.value}>
                    {wlData.requirements.numberOfEventsMonthly || "0"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>عدد الضيوف الشهريين</span>
                  <span className={styles.value}>
                    {wlData.requirements.numberOfGuestsMonthly || "0"}
                  </span>
                </div>
                {wlData.requirements.eventTypes?.length > 0 && (
                  <div className={styles.tagsSection}>
                    <span className={styles.label}>أنواع الفعاليات</span>
                    <div className={styles.tagsList}>
                      {wlData.requirements.eventTypes.map((type, idx) => (
                        <span key={idx} className={styles.tag}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {wlData.requirements.eventsTypesOther && (
                  <div className={styles.infoRow}>
                    <span className={styles.label}>أنواع أخرى</span>
                    <span className={styles.value}>
                      {wlData.requirements.eventsTypesOther}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.noData}>لم يتم تحديد المتطلبات</p>
            )}
          </div>
        </div>

        {/* Address Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📍</span>
            العنوان
          </h2>
          <div className={styles.cardContent}>
            {wlData?.address ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.label}>المدينة</span>
                  <span className={styles.value}>
                    {wlData.address.city || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>الحي</span>
                  <span className={styles.value}>
                    {wlData.address.neighborhood || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>الشارع</span>
                  <span className={styles.value}>
                    {wlData.address.street || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>رقم المبنى</span>
                  <span className={styles.value}>
                    {wlData.address.buildingNumber || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>الرقم الإضافي</span>
                  <span className={styles.value}>
                    {wlData.address.additionalNumber || "-"}
                  </span>
                </div>
              </>
            ) : (
              <p className={styles.noData}>لم يتم تحديد العنوان</p>
            )}
          </div>
        </div>

        {/* License & Tax Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📄</span>
            الترخيص والضرائب
          </h2>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <span className={styles.label}>رقم السجل التجاري</span>
              <span className={styles.value}>
                {wlData?.licenseNumber || "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>الرقم الضريبي</span>
              <span className={styles.value}>{wlData?.taxNumber || "-"}</span>
            </div>
          </div>
        </div>

        {/* Plan Selection Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>�</span>
            الباقة المختارة
          </h2>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <span className={styles.label}>الباقة</span>
              <span className={styles.value}>
                {planSelection?.planCode === "pro"
                  ? "برو (Pro)"
                  : planSelection?.planCode === "elite"
                    ? "إيليت (Elite)"
                    : planSelection?.planCode || "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>دورة الفوترة</span>
              <span className={styles.value}>
                {planSelection?.billingCycle === "yearly"
                  ? "سنوي"
                  : planSelection?.billingCycle === "monthly"
                    ? "شهري"
                    : "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>براندينج مخصص</span>
              <span className={styles.value}>
                {planSelection?.needsCustomBranding ? "نعم" : "لا"}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Management Section */}
        <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>⚙️</span>
            إدارة المميزات
          </h2>
          <div className={styles.cardContent}>
            {loadingFeatures ? (
              <p className={styles.noData}>جاري تحميل المميزات...</p>
            ) : features.length > 0 ? (
              <div className={styles.featuresGrid}>
                {features.map((feature) => (
                  <FeatureToggle
                    key={feature.name}
                    feature={feature}
                    onToggle={handleFeatureToggle}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.noData}>لا توجد مميزات متاحة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhitelabelDetailsWrapper;
