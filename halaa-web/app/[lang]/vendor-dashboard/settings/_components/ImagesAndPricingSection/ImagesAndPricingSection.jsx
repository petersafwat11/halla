"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import PopupLayout from "@/ui/commen/popup/PopupLayout";
import ImagePreviewModal from "@/ui/vendor/modals/ImagePreviewModal";
import ImagesAndPricingEditForm from "./ImagesAndPricingEditForm";
import { keyFromSignedUrl } from "@/utils/vendorHelpers";
import { apiRequest } from "@/services/http";
import { API_PATHS } from "@halaa/shared/api/paths";
import {
  SectionCard,
  DocThumb,
  EmptyState,
  ThumbRow,
} from "../_shared/SettingsPrimitives";
import styles from "./imagesAndPricingSection.module.css";

/**
 * Read-only summary card + edit popup for the Images & Pricing section.
 * Inline thumbnails expose quick delete buttons; both the inline path and the
 * edit-form path hit the same `DELETE /users/profile/vendorImage` endpoint
 * with `{ field, key }` (key extracted from the signed URL) and refetch.
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

  const renderGallery = (label, images, field) => (
    <div className={styles.gallery}>
      <span className={styles.label}>{label}</span>
      {images.length > 0 ? (
        <ThumbRow>
          {images.map((img, index) => {
            const url = typeof img === "string" ? img : img?.url;
            if (!url) return null;
            const key = keyFromSignedUrl(url);
            return (
              <DocThumb
                key={`${field}-${index}-${url}`}
                src={url}
                onView={() => setPreviewImage(url)}
                onDelete={() => handleDelete(field, url)}
                isDeleting={deletingKey === key}
              />
            );
          })}
        </ThumbRow>
      ) : (
        <EmptyState>{t("imagesAndPricing.noImages", "لا توجد صور")}</EmptyState>
      )}
    </div>
  );

  return (
    <>
      <SectionCard
        title={t("imagesAndPricing.title")}
        onEdit={() => setIsPopupOpen(true)}
      >
        {renderGallery(
          t("imagesAndPricing.previousWorkImages"),
          portfolioImages,
          "portfolioImages"
        )}
        {renderGallery(
          t("imagesAndPricing.priceListsAndPackages"),
          pricePackages,
          "pricePackages"
        )}
      </SectionCard>

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

      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
        alt={t("imagesAndPricing.title", "Preview")}
      />
    </>
  );
};

export default ImagesAndPricingSection;
