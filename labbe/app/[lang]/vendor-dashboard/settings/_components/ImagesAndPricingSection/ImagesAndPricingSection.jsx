"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { toast } from "react-toastify";

import styles from "./imagesAndPricingSection.module.css";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import ImagesAndPricingEditForm from "./ImagesAndPricingEditForm";
import { keyFromSignedUrl } from "@/utils/vendorHelpers";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halla/shared/api/paths";

/**
 * Read-only summary card + edit popup for the Images & Pricing section.
 *
 * The popup is rendered by `ImagesAndPricingEditForm` so we can deliver the
 * per-item delete + multi-file upload UX in one place. Inline thumbnails on
 * the summary card still expose quick delete buttons; both delete paths hit
 * the same DELETE endpoint and refetch on success.
 */
const ImagesAndPricingSection = ({ data, onSave, onRefetch }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const portfolioImages = (data?.portfolioImages || []).filter(Boolean);
  const pricePackages = (data?.pricePackages || []).filter(Boolean);

  const handleFormSubmit = async (payload) => {
    setIsLoading(true);
    try {
      if (onSave) await onSave(payload);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (field, signedUrl) => {
    const key = keyFromSignedUrl(signedUrl);
    if (!key) {
      toast.error(t("messages.deleteFailed", "Failed to delete image"));
      return;
    }
    if (
      !window.confirm(
        t("imagesAndPricing.confirmDelete", "Delete this image?")
      )
    ) {
      return;
    }
    setDeletingKey(key);
    try {
      await apiRequest({
        method: "DELETE",
        path: API_PATHS.users.deleteVendorImage,
        data: { field, key },
      });
      toast.success(t("messages.imageDeleted", "Image deleted"));
      if (onRefetch) onRefetch();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          t("messages.deleteFailed", "Failed to delete image")
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const renderImageGrid = (images, field) => {
    if (!images || images.length === 0) {
      return (
        <div className={styles.noImages}>
          {t("imagesAndPricing.noImages", "لا توجد صور")}
        </div>
      );
    }
    return images.map((img, index) => {
      const url = typeof img === "string" ? img : img?.url;
      if (!url) return null;
      const key = keyFromSignedUrl(url);
      const isDeleting = deletingKey === key;
      return (
        <div
          key={`${field}-${index}-${url}`}
          className={styles.imagePreview}
        >
          <div
            className={styles.imageClickable}
            onClick={() => setPreviewImage(url)}
          >
            <Image
              src={url}
              alt={`${field}-${index}`}
              width={80}
              height={60}
              className={styles.thumbnailImage}
              unoptimized
            />
          </div>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => handleDelete(field, url)}
            disabled={isDeleting}
            aria-label={t("buttons.delete", "Delete")}
          >
            {isDeleting ? "…" : "×"}
          </button>
        </div>
      );
    });
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>{t("imagesAndPricing.title")}</div>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => setIsPopupOpen(true)}
          >
            <Image
              src="/svg/vendor/edit.svg"
              alt={t("buttons.edit")}
              width={24}
              height={24}
            />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <label className={styles.label}>
              {t("imagesAndPricing.previousWorkImages")}
            </label>
            <div className={styles.imageRow}>
              <div className={styles.thumbnailContainer}>
                {renderImageGrid(portfolioImages, "portfolioImages")}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>
              {t("imagesAndPricing.priceListsAndPackages")}
            </label>
            <div className={styles.imageRow}>
              <div className={styles.thumbnailContainer}>
                {renderImageGrid(pricePackages, "pricePackages")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PopupLayout
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        size="medium"
      >
        <ImagesAndPricingEditForm
          existingPortfolio={portfolioImages}
          existingPricing={pricePackages}
          onSave={handleFormSubmit}
          onClose={() => setIsPopupOpen(false)}
          onRefetch={onRefetch}
          isLoading={isLoading}
        />
      </PopupLayout>

      {previewImage && (
        <div
          className={styles.modalOverlay}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={() => setPreviewImage(null)}
            >
              ×
            </button>
            <Image
              src={previewImage}
              alt="Preview"
              width={600}
              height={400}
              className={styles.previewImage}
              style={{ objectFit: "contain" }}
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImagesAndPricingSection;
