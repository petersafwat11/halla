"use client";
import { useTranslation } from "react-i18next";
import {
  FaCheck,
  FaWhatsapp,
  FaMobile,
  FaQrcode,
  FaBell,
  FaUsers,
  FaGift,
  FaCalendarAlt,
  FaUserShield,
  FaEnvelope,
  FaComments,
  FaSms,
} from "react-icons/fa";
import { getLocalized } from "@/utils/locale";
import styles from "./FeaturesList.module.css";

const FEATURE_ICONS = {
  mobile: FaMobile,
  whatsapp: FaWhatsapp,
  sms: FaSms,
  qrcode: FaQrcode,
  scan: FaQrcode,
  flexible: FaUserShield,
  staff: FaUsers,
  gate: FaUserShield,
  rsvp: FaComments,
  reply: FaComments,
  reminder: FaBell,
  email: FaEnvelope,
  gift: FaGift,
  template: FaCalendarAlt,
  premium: FaGift,
  report: FaCalendarAlt,
  event: FaCalendarAlt,
  support: FaComments,
  phone: FaMobile,
  verified: FaCheck,
  web: FaQrcode,
  tracking: FaBell,
};

/**
 * Displays plan features in a grid
 */
const FeaturesList = ({ features = [], title }) => {
  const { i18n } = useTranslation("plans");

  if (!features.length) return null;

  return (
    <div className={styles.featuresSection}>
      {title && <h3 className={styles.featuresTitle}>{title}</h3>}
      <div className={styles.featuresGrid}>
        {features.map((feature, index) => {
          const IconComponent = FEATURE_ICONS[feature.icon] || FaCheck;
          return (
            <div key={index} className={styles.featureItem}>
              <IconComponent className={styles.featureIcon} />
              <span>{getLocalized(feature, "label", i18n.language)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturesList;
