"use client";

import { useTranslation } from "react-i18next";
import styles from "./VendorDetailsWrapper.module.css";

const SOCIAL_PLATFORMS = ["instagram", "facebook", "tiktok", "twitter", "linkedin", "youtube", "whatsapp", "website"];

const PLATFORM_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  website: "socialLinks.website",
};

export default function VendorSocialLinks({ socialLinks }) {
  const { t } = useTranslation("adminVendorDetails");

  if (!socialLinks) {
    return <p className={styles.noData}>{t("socialLinks.noLinks")}</p>;
  }

  const activeLinks = SOCIAL_PLATFORMS.filter(
    (platform) => platform === "whatsapp"
      ? /^(?:\+?966|0)?5\d{8}$/.test(socialLinks[platform] || "")
      : /^https?:\/\//i.test(socialLinks[platform] || "")
  );

  if (activeLinks.length === 0) {
    return <p className={styles.noData}>{t("socialLinks.noLinks")}</p>;
  }

  return (
    <div className={styles.socialLinks}>
      {activeLinks.map((platform) => (
        <a
          key={platform}
          href={platform === "whatsapp"
            ? `https://wa.me/966${socialLinks[platform].replace(/^(?:\+?966|0)/, "")}`
            : socialLinks[platform]}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialLink}
        >
          <span>{t(`socialLinks.${platform}`, PLATFORM_LABELS[platform])}</span>
          <span dir="ltr" style={{ display: "block", overflowWrap: "anywhere", marginTop: "0.4rem" }}>{socialLinks[platform]}</span>
        </a>
      ))}
    </div>
  );
}
