"use client";

import { useTranslation } from "react-i18next";
import styles from "./VendorDetailsWrapper.module.css";

const SOCIAL_PLATFORMS = ["instagram", "facebook", "tiktok", "twitter", "website"];

const PLATFORM_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  twitter: "Twitter",
  website: "socialLinks.website",
};

export default function VendorSocialLinks({ socialLinks }) {
  const { t } = useTranslation("adminVendorDetails");

  if (!socialLinks) {
    return <p className={styles.noData}>{t("socialLinks.noLinks")}</p>;
  }

  const activeLinks = SOCIAL_PLATFORMS.filter(
    (platform) => socialLinks[platform]
  );

  if (activeLinks.length === 0) {
    return <p className={styles.noData}>{t("socialLinks.noLinks")}</p>;
  }

  return (
    <div className={styles.socialLinks}>
      {activeLinks.map((platform) => (
        <a
          key={platform}
          href={socialLinks[platform]}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.socialLink}
        >
          <span>{t(`socialLinks.${platform}`, PLATFORM_LABELS[platform])}</span>
        </a>
      ))}
    </div>
  );
}
