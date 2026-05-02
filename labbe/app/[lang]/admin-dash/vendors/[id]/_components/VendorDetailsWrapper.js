"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./VendorDetailsWrapper.module.css";
import { toast } from "react-toastify";
import { cookieUtils } from "@/utils/cookieUtils";
import adminDashboardAPI from "@/services/adminDashboard";

const VendorDetailsWrapper = ({ vendorData, error }) => {
  const router = useRouter();
  const { t } = useTranslation("common");

  // Helper function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    // Use NEXT_PUBLIC_API_URL and extract base URL
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const baseUrl = apiUrl.replace("/api/v2", "").replace("/api", "");
    const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    const fullUrl = `${baseUrl}${cleanPath}`;
    console.log("Image URL generated:", { imagePath, baseUrl, fullUrl });
    return fullUrl;
  };

  // Handle image error - show placeholder
  const handleImageError = (e) => {
    console.error("Image failed to load:", e.target.src);
    e.target.src = "/images/placeholder.png";
    e.target.onerror = null; // Prevent infinite loop
  };

  // Get vendor data from nested response structure
  const vendor = vendorData?.vendor || vendorData;
  const roleData = vendor?.vendorData || vendor?.roleData || vendor?.profile?.vendorData || {};

  // Image popup state
  const [selectedImage, setSelectedImage] = useState(null);

  const handleApprove = async () => {
    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.vendors.approve(vendor.id || vendor._id, token);
      toast.success(t("messages.approveSuccess", "تمت الموافقة بنجاح"));
      router.refresh();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error(t("messages.approveError", "فشل في الموافقة"));
    }
  };

  const handleSuspend = async () => {
    const confirmed = window.confirm(
      t("actions.confirmSuspend", "هل أنت متأكد من إيقاف هذا التاجر؟"),
    );
    if (!confirmed) return;

    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.vendors.updateStatus(
        vendor.id || vendor._id,
        "suspended",
        token,
      );
      toast.success(t("messages.suspendSuccess", "تم الإيقاف بنجاح"));
      router.refresh();
    } catch (error) {
      console.error("Error suspending:", error);
      toast.error(t("messages.suspendError", "فشل في الإيقاف"));
    }
  };

  const handleActivate = async () => {
    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.vendors.updateStatus(
        vendor.id || vendor._id,
        "approved",
        token,
      );
      toast.success(t("messages.activateSuccess", "تم التفعيل بنجاح"));
      router.refresh();
    } catch (error) {
      console.error("Error activating:", error);
      toast.error(t("messages.activateError", "فشل في التفعيل"));
    }
  };

  // Service category labels with both Arabic and English
  const categoryLabels = {
    eventPlanning: { ar: "خدمات تنظيم الفعاليات", en: "Event Planning" },
    mediaProduction: { ar: "التصوير والإنتاج", en: "Media Production" },
    giftsAndGiveaways: { ar: "الهدايا والتوزيعات", en: "Gifts and Giveaways" },
    foodAndBeverages: { ar: "الأطعمة والمشروبات", en: "Food and Beverages" },
    beautyAndFashion: { ar: "التجميل والأزياء", en: "Beauty and Fashion" },
    logisticsAndDelivery: {
      ar: "الخدمات اللوجستية والتوصيل",
      en: "Logistics and Delivery",
    },
    corporateServices: { ar: "خدمات الشركات", en: "Corporate Services" },
    supportServices: { ar: "خدمات الدعم", en: "Support Services" },
    technicalServices: { ar: "الخدمات التقنية", en: "Technical Services" },
    soundLightingEntertainment: {
      ar: "الصوت والإضاءة والترفيه",
      en: "Sound, Lighting & Entertainment",
    },
    hallsAndVenues: { ar: "القاعات والأماكن", en: "Halls and Venues" },
  };

  // Service subcategory labels in Arabic
  const serviceLabels = {
    // Event Planning
    eventCoordination: "تنسيق الفعاليات",
    weddingPlanning: "تخطيط حفلات الزفاف",
    corporateEventPlanning: "تخطيط فعاليات الشركات",
    birthdayPartyPlanning: "تخطيط حفلات أعياد الميلاد",
    hallAndLoungeRentals: "تأجير القاعات والصالات",
    outdoorEventSetup: "إعداد الفعاليات الخارجية",
    // Media Production
    photography: "التصوير الفوتوغرافي",
    videography: "التصوير بالفيديو",
    liveStreaming: "البث المباشر",
    dronePhotography: "التصوير بالطائرات المسيرة",
    photoBooths: "أكشاك التصوير",
    videoEditing: "تحرير الفيديو",
    // Add more as needed
  };

  // Image Wrapper Component
  const ImageWrapper = ({ src, alt, title, onClick }) => (
    <div className={styles.imageWrapperCard}>
      {title && <h4 className={styles.imageTitle}>{title}</h4>}
      <div className={styles.imageBox} onClick={onClick}>
        <img
          src={src}
          alt={alt}
          className={styles.galleryImage}
          onError={handleImageError}
        />
      </div>
    </div>
  );

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

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>خطأ في تحميل بيانات التاجر</h2>
          <p>{error}</p>
          <button onClick={() => router.back()} className={styles.backBtn}>
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard}>
          <p>جاري تحميل بيانات التاجر...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          ← العودة إلى قائمة التجار
        </button>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h1>{roleData?.brandName || "تاجر"}</h1>
            <p className={styles.ownerName}>
              {roleData?.ownerFullName || vendor?.name}
            </p>
          </div>
          <div className={styles.statusContainer}>
            {getStatusBadge(roleData?.vendorStatus || vendor?.status)}
            {roleData?.rating && (
              <span className={styles.rating}>⭐ {roleData.rating}/5</span>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              {(vendor?.status === "pending" ||
                vendor?.status === "rejected") && (
                <button
                  onClick={handleApprove}
                  className={`${styles.actionBtn} ${styles.approveBtn}`}
                  title={t("actions.approve", "موافقة")}
                >
                  ✓ {t("actions.approve", "موافقة")}
                </button>
              )}

              {vendor?.status === "suspended" ? (
                <button
                  onClick={handleActivate}
                  className={`${styles.actionBtn} ${styles.activateBtn}`}
                  title={t("actions.activate", "تفعيل")}
                >
                  ▶ {t("actions.activate", "تفعيل")}
                </button>
              ) : (
                vendor?.status !== "pending" &&
                vendor?.status !== "rejected" && (
                  <button
                    onClick={handleSuspend}
                    className={`${styles.actionBtn} ${styles.suspendBtn}`}
                    title={t("actions.suspend", "إيقاف")}
                  >
                    ⛔ {t("actions.suspend", "إيقاف")}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.grid}>
        {/* Identity Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>👤</span>
            بيانات الهوية
          </h2>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <span className={styles.label}>اسم العلامة التجارية</span>
              <span className={styles.value}>{roleData?.brandName || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>اسم المالك</span>
              <span className={styles.value}>
                {roleData?.ownerFullName || vendor?.name || "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>البريد الإلكتروني</span>
              <span className={styles.value}>{vendor?.email || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>رقم الهاتف</span>
              <span className={styles.value} dir="ltr">
                {vendor?.phoneNumber || "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>تاريخ التسجيل</span>
              <span className={styles.value}>
                {vendor?.createdAt
                  ? new Date(vendor.createdAt).toLocaleDateString("ar-SA")
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Service Description Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📝</span>
            وصف الخدمة
          </h2>
          <div className={styles.cardContent}>
            <p className={styles.description}>
              {roleData?.serviceDescription || "لا يوجد وصف"}
            </p>
            {roleData?.otherData && (
              <div className={styles.infoRow}>
                <span className={styles.label}>معلومات إضافية</span>
                <span className={styles.value}>{roleData.otherData}</span>
              </div>
            )}
          </div>
        </div>

        {/* Service Location Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📍</span>
            منطقة الخدمة
          </h2>
          <div className={styles.cardContent}>
            {roleData?.serviceLocation ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.label}>المنطقة</span>
                  <span className={styles.value}>
                    {roleData.serviceLocation.regionNameAr || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>المدينة</span>
                  <span className={styles.value}>
                    {roleData.serviceLocation.cityNameAr || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>نوع التغطية</span>
                  <span className={styles.value}>
                    {roleData.serviceLocation.coverageType || "-"}
                  </span>
                </div>
              </>
            ) : (
              <p className={styles.noData}>لم يتم تحديد منطقة الخدمة</p>
            )}
          </div>
        </div>

        {/* Commercial Verification Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>📄</span>
            التحقق التجاري
          </h2>
          <div className={styles.cardContent}>
            <div className={styles.infoRow}>
              <span className={styles.label}>رقم السجل التجاري</span>
              <span className={styles.value}>
                {roleData?.commercialRecordNumber || "-"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>رقم الهوية الوطنية</span>
              <span className={styles.value}>
                {roleData?.nationalId || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🔗</span>
            الروابط الاجتماعية
          </h2>
          <div className={styles.cardContent}>
            {roleData?.socialLinks ? (
              <div className={styles.socialLinks}>
                {roleData.socialLinks.instagram && (
                  <a
                    href={roleData.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    <span>Instagram</span>
                  </a>
                )}
                {roleData.socialLinks.facebook && (
                  <a
                    href={roleData.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    <span>Facebook</span>
                  </a>
                )}
                {roleData.socialLinks.tiktok && (
                  <a
                    href={roleData.socialLinks.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    <span>TikTok</span>
                  </a>
                )}
                {roleData.socialLinks.twitter && (
                  <a
                    href={roleData.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    <span>Twitter</span>
                  </a>
                )}
                {roleData.socialLinks.website && (
                  <a
                    href={roleData.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                  >
                    <span>الموقع الإلكتروني</span>
                  </a>
                )}
                {!roleData.socialLinks.instagram &&
                  !roleData.socialLinks.facebook &&
                  !roleData.socialLinks.tiktok &&
                  !roleData.socialLinks.twitter &&
                  !roleData.socialLinks.website && (
                    <p className={styles.noData}>لا توجد روابط</p>
                  )}
              </div>
            ) : (
              <p className={styles.noData}>لا توجد روابط اجتماعية</p>
            )}
          </div>
        </div>

        {/* Service Categories Section - Full Width */}
        <div className={`${styles.card} ${styles.fullWidth}`}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🏷️</span>
            الخدمات المختارة
          </h2>
          <div className={styles.cardContent}>
            {roleData?.serviceCategories &&
            Object.keys(roleData.serviceCategories).length > 0 ? (
              <div className={styles.servicesContainer}>
                {Object.entries(roleData.serviceCategories).map(
                  ([category, values]) => {
                    if (!values || values.length === 0) return null;
                    return (
                      <div key={category} className={styles.serviceCategory}>
                        <h3 className={styles.serviceCategoryTitle}>
                          {categoryLabels[category]?.ar || category}
                        </h3>
                        <ul className={styles.serviceList}>
                          {values.map((value, idx) => (
                            <li key={idx} className={styles.serviceItem}>
                              {serviceLabels[value] || value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  },
                )}
              </div>
            ) : (
              <p className={styles.noData}>لم يتم اختيار خدمات</p>
            )}
          </div>
        </div>

        {/* Gallery Section - Full Width */}
        <div className={`${styles.card} ${styles.fullWidth}`}>
          <h2 className={styles.cardTitle}>
            <span className={styles.cardIcon}>🖼️</span>
            المعرض والملفات
          </h2>
          <div className={styles.cardContent}>
            {/* All Images in Grid */}
            <div className={styles.galleryGrid}>
              {/* Business Logo */}
              {roleData?.businessLogo && (
                <ImageWrapper
                  src={getImageUrl(roleData.businessLogo)}
                  alt="Business Logo"
                  title="شعار النشاط التجاري"
                  onClick={() =>
                    setSelectedImage(getImageUrl(roleData.businessLogo))
                  }
                />
              )}

              {/* Portfolio Images */}
              {roleData?.portfolioImages?.map((img, idx) => (
                <ImageWrapper
                  key={`portfolio-${idx}`}
                  src={getImageUrl(img)}
                  alt={`Portfolio ${idx + 1}`}
                  title={`صورة المعرض ${idx + 1}`}
                  onClick={() => setSelectedImage(getImageUrl(img))}
                />
              ))}

              {/* Price Packages */}
              {roleData?.pricePackages?.map((pkg, idx) => (
                <ImageWrapper
                  key={`package-${idx}`}
                  src={getImageUrl(pkg)}
                  alt={`Package ${idx + 1}`}
                  title={`باقة الأسعار ${idx + 1}`}
                  onClick={() => setSelectedImage(getImageUrl(pkg))}
                />
              ))}

              {/* Verification Documents */}
              {roleData?.commercialRecordImage && (
                <ImageWrapper
                  src={getImageUrl(roleData.commercialRecordImage)}
                  alt="Commercial Record"
                  title="صورة السجل التجاري"
                  onClick={() =>
                    setSelectedImage(
                      getImageUrl(roleData.commercialRecordImage),
                    )
                  }
                />
              )}

              {roleData?.nationalIdImage && (
                <ImageWrapper
                  src={getImageUrl(roleData.nationalIdImage)}
                  alt="National ID"
                  title="صورة الهوية الوطنية"
                  onClick={() =>
                    setSelectedImage(getImageUrl(roleData.nationalIdImage))
                  }
                />
              )}

              {roleData?.profileFile && (
                <ImageWrapper
                  src={getImageUrl(roleData.profileFile)}
                  alt="Profile File"
                  title="ملف التعريف"
                  onClick={() =>
                    setSelectedImage(getImageUrl(roleData.profileFile))
                  }
                />
              )}
            </div>

            {!roleData?.businessLogo &&
              !roleData?.portfolioImages?.length &&
              !roleData?.pricePackages?.length &&
              !roleData?.commercialRecordImage &&
              !roleData?.nationalIdImage &&
              !roleData?.profileFile && (
                <p className={styles.noData}>لا توجد ملفات مرفوعة</p>
              )}
          </div>
        </div>
      </div>

      {/* Image Popup Modal */}
      {selectedImage && (
        <div
          className={styles.imagePopup}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className={styles.popupContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className={styles.popupImage}
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDetailsWrapper;
