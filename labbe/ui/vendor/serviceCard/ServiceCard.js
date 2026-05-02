"use client";
import React from "react";
import Image from "next/image";
import styles from "./serviceCard.module.css";
import { useTranslation } from "react-i18next";

const PLACEHOLDER_IMAGE = "/images/placeholder-service.jpg";
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || "http://localhost:8000";

const getImageUrl = (image) => {
  if (!image) return PLACEHOLDER_IMAGE;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads")) return `${API_BASE}${image}`;
  // Handle absolute filesystem paths from old DB records
  const publicIdx = image.indexOf("public");
  if (publicIdx !== -1) {
    const relative = image.substring(publicIdx + 6).replace(/\\/g, "/");
    return `${API_BASE}${relative}`;
  }
  return PLACEHOLDER_IMAGE;
};

const ServiceCard = ({ service, onToggleStatus, onDelete }) => {
  const { t } = useTranslation("vendorServices");
  const isAvailable = service?.isAvailable ?? true;

  const handleToggle = () => {
    if (onToggleStatus) {
      onToggleStatus(service.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(service.id);
    }
  };

  const imageUrl = getImageUrl(service?.image);
  const tags = service?.tags || [];

  return (
    <div className={styles.card}>
      <div className={styles.cardContent}>
        <div className={styles.imageWrapper}>
          <Image
            src={imageUrl}
            alt={service?.title || t("service.defaultTitle", "Service")}
            width={113}
            height={114}
            className={styles.image}
            unoptimized={imageUrl.startsWith("http")}
          />
          <div className={styles.imageOverlay}></div>
        </div>
        <div className={styles.details}>
          <div className={styles.serviceInfo}>
            <div className={styles.titleSection}>
              <h3 className={styles.title}>
                {service?.title || t("service.defaultTitle", "Service")}
              </h3>
              {onDelete && (
                <button
                  className={styles.deleteButton}
                  onClick={handleDelete}
                  aria-label={t("buttons.delete", "Delete")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>

            {service?.category && (
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  {service.category}
                </span>
              </div>
            )}
          </div>

          <div className={styles.tags}>
            {tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.price}>
              {(service?.price || 0).toLocaleString()} {t("service.price")}
            </div>

            <div className={styles.toggleSection}>
              <span className={styles.toggleLabel}>
                {isAvailable
                  ? t("buttons.available")
                  : t("buttons.unavailable")}
              </span>
              <button
                className={`${styles.toggle} ${isAvailable ? styles.toggleActive : ""
                  }`}
                onClick={handleToggle}
                aria-label={
                  isAvailable
                    ? t("buttons.available")
                    : t("buttons.unavailable")
                }
              >
                <span className={styles.toggleCircle}></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
