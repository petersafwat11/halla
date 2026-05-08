"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  FaCheck,
  FaUserShield,
  FaMobile,
  FaWhatsapp,
  FaComment,
  FaQrcode,
  FaUserCheck,
  FaReply,
  FaBell,
  FaPalette,
  FaGem,
  FaChartBar,
  FaHeadset,
  FaPaintBrush,
  FaExchangeAlt,
  FaDoorOpen,
  FaEnvelope,
  FaGift,
} from "react-icons/fa";
import { getLocalized } from "@/utils/locale";
import styles from "../stepFive.module.css";

const FEATURE_ICONS = {
  mobile: FaMobile,
  whatsapp: FaWhatsapp,
  sms: FaComment,
  qrcode: FaQrcode,
  scan: FaUserCheck,
  flexible: FaExchangeAlt,
  staff: FaUserShield,
  gate: FaDoorOpen,
  reply: FaReply,
  reminder: FaBell,
  email: FaEnvelope,
  gift: FaGift,
  template: FaPalette,
  premium: FaGem,
  report: FaChartBar,
  support: FaHeadset,
  palette: FaPaintBrush,
};

const PlanFeaturesPanel = ({ plan }) => {
  const { t, i18n } = useTranslation("signup");
  const featuresArray = plan?.featuresArray || [];

  if (!plan || featuresArray.length === 0) return null;

  return (
    <div className={styles.featuresSection}>
      <h4 className={styles.featuresSectionTitle}>
        {t("signupForm.whiteLabel.planSelection.features")}
      </h4>
      <div className={styles.featuresGrid}>
        {featuresArray.map((feature, index) => {
          const IconComp = FEATURE_ICONS[feature.icon] || FaCheck;
          return (
            <div key={index} className={styles.featureItem}>
              <IconComp className={styles.featureIcon} />
              <span>{getLocalized(feature, "label", i18n.language)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanFeaturesPanel;
