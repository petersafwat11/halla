"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { toast } from "react-toastify";

import styles from "./imagesAndPricingSection.module.css";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import { imagesAndPricingSchema } from "@/utils/schemas/vendorSettings";
import { keyFromSignedUrl } from "@/utils/vendorHelpers";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";

const ImagesAndPricingSection = ({ data, onSave, onRefetch }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const portfolioImages = data?.portfolioImages || [];
  const pricePackages = data?.pricePackages || [];

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      const newPortfolio = formData.portfolioImages?.files || [];
      const newPrice = formData.pricePackages?.files || [];
      const payload = {};
      if (newPortfolio.length) payload.portfolioImages = newPortfolio;
      if (newPrice.length) payload.pricePackages = newPrice;
      if (Object.keys(payload).length === 0) {
        setIsPopupOpen(false);
        return;
      }
      if (onSave) await onSave(payload);
      setIsPopupOpen(false);
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
    if (!window.confirm(t("imagesAndPricing.confirmDelete", "Delete this image?"))) {
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
        <div key={`${field}-${index}-${url}`} className={styles.imagePreview}>
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

      <PopupLayout isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <DynamicForm
          schema={imagesAndPricingSchema}
          initialData={{ portfolioImages, pricePackages }}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsPopupOpen(false)}
          isLoading={isLoading}
        />
      </PopupLayout>

      {previewImage && (
        <div className={styles.modalOverlay} onClick={() => setPreviewImage(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={() => setPreviewImage(null)}>
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
