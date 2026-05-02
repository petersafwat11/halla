"use client";
import React, { useState } from "react";
import styles from "./imagesAndPricingSection.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import DynamicForm from "@/ui/vendor/dynamicForm/DynamicForm";
import { imagesAndPricingSchema } from "@/utils/schemas/vendorSettings";

const ImagesAndPricingSection = ({ data, onSave }) => {
  const { t } = useTranslation("vendorSettings");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Use data directly as passed from parent
  const displayData = {
    portfolioImages: data?.portfolioImages || [],
    pricePackages: data?.pricePackages || [],
  };

  const existingPortfolioImages = displayData.portfolioImages;
  const existingPricingImages = displayData.pricePackages;

  const handleEditClick = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  const handleImageClick = (imageSrc) => {
    setPreviewImage(imageSrc);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  const handleFormSubmit = async (formData) => {
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave({
          portfolioImages: formData.portfolioImages?.files || [],
          pricePackages: formData.pricePackages?.files || [],
        });
      }
      setIsPopupOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderExistingImages = (images) => {
    if (!images || images.length === 0) {
      return (
        <div className={styles.noImages}>
          {t("imagesAndPricing.noImages", "لا توجد صور")}
        </div>
      );
    }
    return images.slice(0, 4).map((img, index) => {
      const imgSrc = typeof img === "string" ? img : img.url || img;
      return (
        <div
          key={index}
          className={styles.imagePreview}
          onClick={() => handleImageClick(imgSrc)}
        >
          <Image
            src={imgSrc}
            alt={`image-${index}`}
            width={80}
            height={60}
            className={styles.thumbnailImage}
          />
          <span className={styles.viewText}>
            {t("imagesAndPricing.clickToView", "اضغط للعرض")}
          </span>
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
            onClick={handleEditClick}
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
          {/* Portfolio Images Section */}
          <div className={styles.section}>
            <label className={styles.label}>
              {t("imagesAndPricing.previousWorkImages")}
            </label>
            <div className={styles.imageRow}>
              <div className={styles.thumbnailContainer}>
                {renderExistingImages(existingPortfolioImages)}
                {existingPortfolioImages.length > 4 && (
                  <div className={styles.moreImages}>
                    +{existingPortfolioImages.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Images Section */}
          <div className={styles.section}>
            <label className={styles.label}>
              {t("imagesAndPricing.priceListsAndPackages")}
            </label>
            <div className={styles.imageRow}>
              <div className={styles.thumbnailContainer}>
                {renderExistingImages(existingPricingImages)}
                {existingPricingImages.length > 4 && (
                  <div className={styles.moreImages}>
                    +{existingPricingImages.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Popup */}
      <PopupLayout isOpen={isPopupOpen} onClose={handleClosePopup}>
        <DynamicForm
          schema={imagesAndPricingSchema}
          initialData={displayData}
          onSubmit={handleFormSubmit}
          onCancel={handleClosePopup}
          isLoading={isLoading}
        />
      </PopupLayout>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className={styles.modalOverlay} onClick={closePreview}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={closePreview}>
              ×
            </button>
            <Image
              src={previewImage}
              alt="Preview"
              width={600}
              height={400}
              className={styles.previewImage}
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ImagesAndPricingSection;
