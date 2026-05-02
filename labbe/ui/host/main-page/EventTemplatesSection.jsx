"use client";
import React, { useState, useEffect } from "react";
import styles from "./EventTemplatesSection.module.css";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";

function EventTemplatesSection() {
  const { t } = useTranslation("home-events");
  const [activeTab, setActiveTab] = useState("wedding");
  const [currentPage, setCurrentPage] = useState(0);
  const isMobile = useMediaQuery("(max-width: 550px)");
  const isTablet = useMediaQuery("(max-width: 768px)");

  // Items per page based on screen size
  const itemsPerPage = isMobile ? 3 : isTablet ? 4 : 4;

  const tabs = [
    { id: "wedding", label: t("templates.wedding") },
    { id: "graduation", label: t("templates.graduation") },
    { id: "diplomatic", label: t("templates.diplomatic") },
    { id: "birthday", label: t("templates.birthday") },
    { id: "corporate", label: t("templates.corporate") },
    { id: "religious", label: t("templates.religious") },
    { id: "anniversary", label: t("templates.anniversary") },
    { id: "baby", label: t("templates.baby") },
  ];

  const templates = [
    {
      id: 1,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/25805b85ee9b7ab1a9bb9121e0ef8891b372b99b?width=258",
    },
    {
      id: 2,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/e10f623d23524928d36d61b599d31b0409206b70?width=258",
    },
    {
      id: 3,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/63263fdc6efb77a2e22e483f73b9e60119da3398?width=258",
    },
    {
      id: 4,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/20af40954991becead80f36049c2bff642905210?width=258",
    },
    {
      id: 5,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/94f49e605c068f141cd1dff5032ecf94f7f5cc47?width=258",
    },
    {
      id: 6,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/20af40954991becead80f36049c2bff642905210?width=258",
    },
    {
      id: 7,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/63263fdc6efb77a2e22e483f73b9e60119da3398?width=258",
    },
    {
      id: 8,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/79fc298d2dad702b8fc02fa44bcc27a1c4f682f7?width=258",
    },
    {
      id: 9,
      src: "https://api.builder.io/api/v1/image/assets/TEMP/ad33659c33381eac40061641b81f19d65a13ad9f?width=258",
    },
  ];

  // Calculate total pages
  const totalPages = Math.ceil(templates.length / itemsPerPage);

  // Get current page templates
  const startIndex = currentPage * itemsPerPage;
  const currentTemplates = templates.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when screen size changes
  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile, isTablet]);

  const handleDotClick = (index) => {
    setCurrentPage(index);
  };

  return (
    <div className={styles.templatesContainer}>
      <div className={styles.templatesCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("templates.title")}</h2>
          <p className={styles.subtitle}>
            {t("templates.subtitle")}
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.templatesGrid}>
            {currentTemplates.map((template) => (
              <div key={template.id} className={styles.templateCard}>
                <div className={styles.templateCardInner}>
                  <img
                    src={template.src}
                    alt={`Template ${template.id}`}
                    className={styles.templateImage}
                  />
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: totalPages }).map((_, index) => (
                <div
                  key={index}
                  className={`${styles.dot} ${index === currentPage ? styles.activeDot : ""
                    }`}
                  onClick={() => handleDotClick(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventTemplatesSection;
