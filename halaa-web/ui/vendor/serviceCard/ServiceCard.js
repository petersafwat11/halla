"use client";
import React from "react";
import Image from "next/image";
import styles from "./serviceCard.module.css";
import { useTranslation } from "react-i18next";
import { getImageUrl as resolveImageUrl } from "@/utils/vendorHelpers";

const PLACEHOLDER_IMAGE = "/images/placeholder-service.jpg";

const getImageUrl = (image) => {
  if (!image) return PLACEHOLDER_IMAGE;
  const resolved = resolveImageUrl(image);
  return resolved || PLACEHOLDER_IMAGE;
};

const ServiceCard = ({ service, onToggleStatus, onDelete, onEdit }) => {
  const { t } = useTranslation("vendorServices");
  const isAvailable = service?.isAvailable ?? true;

  const handleToggle = () => {
    if (onToggleStatus) onToggleStatus(service.id);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(service.id);
  };

  const handleEdit = () => {
    if (onEdit) onEdit(service);
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
              <div className={styles.actionButtons}>
                {onEdit && (
                  <button
                    className={styles.editButton}
                    onClick={handleEdit}
                    aria-label={t("buttons.edit")}
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C28E5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                {onDelete && (
                  <button
                    className={styles.deleteButton}
                    onClick={handleDelete}
                    aria-label={t("buttons.delete", "Delete")}
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {service?.category && (
              <div className={styles.meta}>
                <span className={styles.metaItem}>{service.category}</span>
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
                {isAvailable ? t("buttons.available") : t("buttons.unavailable")}
              </span>
              <button
                className={`${styles.toggle} ${isAvailable ? styles.toggleActive : ""}`}
                onClick={handleToggle}
                aria-label={
                  isAvailable ? t("buttons.available") : t("buttons.unavailable")
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
