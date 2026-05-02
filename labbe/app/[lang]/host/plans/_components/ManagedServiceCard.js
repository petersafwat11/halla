"use client";
import { useTranslation } from "react-i18next";
import { FaHeadset, FaWhatsapp, FaCheck } from "react-icons/fa";
import styles from "./ManagedServiceCard.module.css";

/**
 * Managed service promotion card with WhatsApp contact
 */
const ManagedServiceCard = ({ managedService }) => {
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

  if (!managedService) return null;

  const openWhatsApp = () => {
    const number = managedService.whatsappNumber || "+966500000000";
    const message = isArabic
      ? "مرحباً، أريد الاستفسار عن خدمة إدارة المناسبات"
      : "Hello, I want to inquire about event management service";
    window.open(
      `https://wa.me/${number.replace("+", "")}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  return (
    <div className={styles.managedServiceCard}>
      <div className={styles.managedHeader}>
        <FaHeadset className={styles.managedIcon} />
        <div>
          <h3 className={styles.managedTitle}>
            {isArabic
              ? managedService.labelAr || "هلا علينا"
              : managedService.labelEn || "Managed by Us"}
          </h3>
          <p className={styles.managedDescription}>
            {isArabic
              ? managedService.descriptionAr || "فريقنا يدير كل شيء نيابة عنك"
              : managedService.descriptionEn || "Our team manages everything for you"}
          </p>
        </div>
        <span className={styles.managedBadge}>
          +{managedService.percentageIncrease || 20}%
        </span>
      </div>

      {managedService.features?.length > 0 && (
        <div className={styles.managedFeatures}>
          {managedService.features.map((feature, index) => (
            <div key={index} className={styles.managedFeatureItem}>
              <FaCheck className={styles.managedFeatureIcon} />
              <span>{isArabic ? feature.labelAr : feature.labelEn}</span>
            </div>
          ))}
        </div>
      )}

      <button className={styles.whatsappButton} onClick={openWhatsApp}>
        <FaWhatsapp className={styles.whatsappIcon} />
        {isArabic ? "تواصل معنا عبر واتساب" : "Contact us on WhatsApp"}
      </button>
    </div>
  );
};

export default ManagedServiceCard;
