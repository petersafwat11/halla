"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import styles from "./VendorDetailsWrapper.module.css";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v2";
const BASE_URL = BACKEND_URL.replace("/api/v2", "").replace("/api", "");

export function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${BASE_URL}${cleanPath}`;
}

export default function VendorImageGallery({ roleData }) {
  const { t } = useTranslation("adminVendorDetails");
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageError = useCallback((e) => {
    e.target.src = "/images/placeholder.png";
    e.target.onerror = null;
  }, []);

  const allImages = [];

  if (roleData?.businessLogo) {
    allImages.push({
      src: getImageUrl(roleData.businessLogo),
      alt: t("gallery.businessLogo"),
      title: t("gallery.businessLogoTitle"),
    });
  }

  if (roleData?.portfolioImages) {
    roleData.portfolioImages.forEach((img, idx) => {
      allImages.push({
        src: getImageUrl(img),
        alt: t("gallery.portfolioAlt", { index: idx + 1 }),
        title: t("gallery.portfolioTitle", { index: idx + 1 }),
      });
    });
  }

  if (roleData?.pricePackages) {
    roleData.pricePackages.forEach((pkg, idx) => {
      allImages.push({
        src: getImageUrl(pkg),
        alt: t("gallery.packageAlt", { index: idx + 1 }),
        title: t("gallery.packageTitle", { index: idx + 1 }),
      });
    });
  }

  if (roleData?.commercialRecordImage) {
    allImages.push({
      src: getImageUrl(roleData.commercialRecordImage),
      alt: t("gallery.commercialRecord"),
      title: t("gallery.commercialRecordTitle"),
    });
  }

  if (roleData?.nationalIdImage) {
    allImages.push({
      src: getImageUrl(roleData.nationalIdImage),
      alt: t("gallery.nationalId"),
      title: t("gallery.nationalIdTitle"),
    });
  }

  if (roleData?.profileFile) {
    allImages.push({
      src: getImageUrl(roleData.profileFile),
      alt: t("gallery.profileFile"),
      title: t("gallery.profileFileTitle"),
    });
  }

  const hasImages = allImages.length > 0;

  if (!hasImages) {
    return <p className={styles.noData}>{t("gallery.noFiles")}</p>;
  }

  return (
    <>
      <div className={styles.galleryGrid}>
        {allImages.map((img, idx) => (
          <div
            key={idx}
            className={styles.imageWrapperCard}
          >
            {img.title && <h4 className={styles.imageTitle}>{img.title}</h4>}
            <div
              className={styles.imageBox}
              onClick={() => img.src && setSelectedImage(img.src)}
            >
              {img.src ? (
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={300}
                  height={250}
                  className={styles.galleryImage}
                  onError={handleImageError}
                />
              ) : (
                <Image
                  src="/images/placeholder.png"
                  alt={img.alt}
                  width={300}
                  height={250}
                  className={styles.galleryImage}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className={styles.imagePopup}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className={styles.popupContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={() => setSelectedImage(null)}
              aria-label={t("gallery.closeImage")}
            >
              ✕
            </button>
            <Image
              src={selectedImage}
              alt={t("gallery.previewAlt")}
              width={800}
              height={600}
              className={styles.popupImage}
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </>
  );
}
