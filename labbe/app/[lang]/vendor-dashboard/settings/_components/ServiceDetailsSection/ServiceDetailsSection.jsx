"use client";
import React, { useState } from "react";
import styles from "./serviceDetailsSection.module.css";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import ImagePreviewModal from "@/ui/vendor/modals/ImagePreviewModal";
import ServiceDetailsEditForm from "./ServiceDetailsEditForm";

const ServiceDetailsSection = ({ data, onSave, onRefetch }) => {
  const { t } = useTranslation("vendorSettings");

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Use data directly as passed from parent
  const displayData = {
    serviceDescription: data?.serviceDescription || "",
    nationalId: data?.nationalId || "",
    nationalIdImage: data?.nationalIdImage || null,
    commercialRecordImage: data?.commercialRecordImage || null,
    serviceLocation: data?.serviceLocation || {},
    serviceCategories: data?.serviceCategories || [],
  };

  const activities = displayData.serviceCategories.length > 0 ? displayData.serviceCategories : [];

  const handleEditClick = () => setIsPopupOpen(true);
  const handleClosePopup = () => setIsPopupOpen(false);
  const handleImageClick = (imageSrc) => setPreviewImage(imageSrc);
  const closePreview = () => setPreviewImage(null);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>{t("serviceDetails.title")}</div>
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
          {/* Document Images Row */}
          <div className={styles.documentsRow}>
            {/* Other Licenses */}
            <div className={styles.uploadField}>
              <label className={styles.label}>
                {t("serviceDetails.otherLicenses")}
              </label>
              {displayData.nationalIdImage ? (
                <div
                  className={styles.imagePreview}
                  onClick={() => handleImageClick(displayData.nationalIdImage)}
                >
                  <Image
                    src={displayData.nationalIdImage}
                    alt="License"
                    width={80}
                    height={60}
                    className={styles.thumbnailImage}
                    unoptimized
                  />
                  <span className={styles.viewText}>
                    {t("serviceDetails.clickToView", "اضغط للعرض")}
                  </span>
                </div>
              ) : (
                <div className={styles.noImage}>
                  {t("serviceDetails.noImage", "لا توجد صورة")}
                </div>
              )}
            </div>

            {/* Commercial Register */}
            <div className={styles.uploadField}>
              <label className={styles.label}>
                {t("serviceDetails.commercialRegister")}
              </label>
              {displayData.commercialRecordImage ? (
                <div
                  className={styles.imagePreview}
                  onClick={() =>
                    handleImageClick(displayData.commercialRecordImage)
                  }
                >
                  <Image
                    src={displayData.commercialRecordImage}
                    alt="Commercial Record"
                    width={80}
                    height={60}
                    className={styles.thumbnailImage}
                    unoptimized
                  />
                  <span className={styles.viewText}>
                    {t("serviceDetails.clickToView", "اضغط للعرض")}
                  </span>
                </div>
              ) : (
                <div className={styles.noImage}>
                  {t("serviceDetails.noImage", "لا توجد صورة")}
                </div>
              )}
            </div>

            {/* National ID Number */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {t("serviceDetails.nationalIdLabel")}
              </label>
              <div className={styles.value}>
                {displayData.nationalId || "-"}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className={styles.fullWidthRow}>
            <div className={styles.fullWidthField}>
              <label className={styles.label}>
                {t("serviceDetails.serviceDescription")}
              </label>
              <div className={styles.descriptionValue}>
                {displayData.serviceDescription ||
                  t("serviceDetails.serviceDescriptionPlaceholder")}
              </div>
            </div>
          </div>

          {/* Activities - Non-editable */}
          <div className={styles.row}>
            <div className={styles.activitiesField}>
              <label className={styles.label}>
                {t("serviceDetails.activities")}
              </label>
              <div className={styles.activitiesContainer}>
                <div className={styles.activitiesRow}>
                  {activities.map((activity, index) => (
                    <div key={index} className={styles.activityTag}>
                      {typeof activity === "string"
                        ? activity
                        : activity?.name || activity}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className={styles.locationSection}>
            <label className={styles.sectionLabel}>
              {t("serviceDetails.serviceLocation", "موقع الخدمة")}
            </label>

            <div className={styles.locationRow}>
              <div className={styles.locationField}>
                <label className={styles.label}>
                  {t("serviceDetails.region", "المنطقة")}
                </label>
                <div className={styles.value}>
                  {displayData.serviceLocation?.regionNameAr ||
                    displayData.serviceLocation?.regionNameEn ||
                    "-"}
                </div>
              </div>

              <div className={styles.locationField}>
                <label className={styles.label}>
                  {t("serviceDetails.city", "المدينة")}
                </label>
                <div className={styles.value}>
                  {displayData.serviceLocation?.cityNameAr ||
                    displayData.serviceLocation?.cityNameEn ||
                    t("serviceDetails.allCities", "جميع المدن")}
                </div>
              </div>

              <div className={styles.locationField}>
                <label className={styles.label}>
                  {t("serviceDetails.districts", "الأحياء")}
                </label>
                <div className={styles.value}>
                  {displayData.serviceLocation?.districtNames?.length > 0
                    ? displayData.serviceLocation.districtNames
                      .map((d) => (d.nameEn || d.nameAr))
                      .join(", ")
                    : t("serviceDetails.allDistricts", "جميع الأحياء")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Popup */}
      <PopupLayout isOpen={isPopupOpen} onClose={handleClosePopup}>
        <ServiceDetailsEditForm
          data={displayData}
          onSave={onSave}
          onClose={handleClosePopup}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          onRefetch={onRefetch}
        />
      </PopupLayout>

      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={closePreview}
        alt={t("serviceDetails.documentPreview", "Document Preview")}
      />
    </>
  );
};

export default ServiceDetailsSection;
