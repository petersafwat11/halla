"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import PopupLayout from "@/ui/commen/popup/PopupLayout";
import ImagePreviewModal from "@/ui/vendor/modals/ImagePreviewModal";
import ServiceDetailsEditForm from "./ServiceDetailsEditForm";
import {
  SectionCard,
  FieldGrid,
  ReadField,
  DocThumb,
  EmptyState,
} from "../_shared/SettingsPrimitives";
import styles from "./serviceDetailsSection.module.css";

const ServiceDetailsSection = ({ data, onSave, onRefetch }) => {
  const { t } = useTranslation("vendorSettings");

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const displayData = {
    serviceDescription: data?.serviceDescription || "",
    taglineAr: data?.taglineAr || "",
    taglineEn: data?.taglineEn || "",
    aboutAr: data?.aboutAr || "",
    aboutEn: data?.aboutEn || "",
    nationalId: data?.nationalId || "",
    nationalIdImage: data?.nationalIdImage || null,
    commercialRecordImage: data?.commercialRecordImage || null,
    serviceLocation: data?.serviceLocation || {},
    serviceCategories: data?.serviceCategories || [],
  };

  const activities = displayData.serviceCategories;
  const loc = displayData.serviceLocation || {};
  const districtNames = loc.districtNames?.length
    ? loc.districtNames.map((d) => d.nameEn || d.nameAr).join("، ")
    : t("serviceDetails.allDistricts", "جميع الأحياء");

  const renderDoc = (label, src) => (
    <div className={styles.docField}>
      <span className={styles.docLabel}>{label}</span>
      {src ? (
        <DocThumb
          src={src}
          onView={() => setPreviewImage(src)}
          viewLabel={t("serviceDetails.clickToView", "اضغط للعرض")}
        />
      ) : (
        <EmptyState>{t("serviceDetails.noImage", "لا توجد صورة")}</EmptyState>
      )}
    </div>
  );

  return (
    <>
      <SectionCard
        title={t("serviceDetails.title")}
        onEdit={() => setIsPopupOpen(true)}
      >
        <div className={styles.docRow}>
          {renderDoc(
            t("serviceDetails.nationalIdImage", t("serviceDetails.otherLicenses", "صورة الهوية الوطنية / الإقامة (اختياري)")),
            displayData.nationalIdImage
          )}
          {renderDoc(
            t("serviceDetails.commercialRegister"),
            displayData.commercialRecordImage
          )}
        </div>

        <FieldGrid>
          <ReadField
            label={t("serviceDetails.nationalIdLabel")}
            value={displayData.nationalId}
          />
        </FieldGrid>

        {(displayData.taglineAr || displayData.taglineEn) && (
          <FieldGrid>
            {displayData.taglineAr && (
              <ReadField
                label={t("serviceDetails.taglineAr", "النبذة القصيرة بالعربية")}
                value={displayData.taglineAr}
              />
            )}
            {displayData.taglineEn && (
              <ReadField
                label={t("serviceDetails.taglineEn", "Short tagline in English")}
                value={displayData.taglineEn}
              />
            )}
          </FieldGrid>
        )}

        {(displayData.aboutAr || displayData.aboutEn || displayData.serviceDescription) && (
          <ReadField
            block
            label={t("serviceDetails.aboutAr", t("serviceDetails.serviceDescription", "النبذة التعريفية"))}
            value={displayData.aboutAr || displayData.serviceDescription || displayData.aboutEn}
            placeholder={t("serviceDetails.serviceDescriptionPlaceholder", "-")}
          />
        )}

        <div className={styles.field}>
          <span className={styles.label}>{t("serviceDetails.activities")}</span>
          {activities.length > 0 ? (
            <div className={styles.tags}>
              {activities.map((activity, index) => {
                const key = typeof activity === "string" ? activity : activity?.name || activity;
                return (
                  <span key={index} className={styles.tag}>
                    {t(`services.serviceTypes.${key}`, key)}
                  </span>
                );
              })}
            </div>
          ) : (
            <EmptyState>{t("serviceDetails.noActivities", "-")}</EmptyState>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>
            {t("serviceDetails.serviceLocation", "موقع الخدمة")}
          </span>
          <FieldGrid>
            <ReadField
              label={t("serviceDetails.region", "المنطقة")}
              value={loc.regionNameAr || loc.regionNameEn}
            />
            <ReadField
              label={t("serviceDetails.city", "المدينة")}
              value={loc.cityNameAr || loc.cityNameEn}
              placeholder={t("serviceDetails.allCities", "جميع المدن")}
            />
            <ReadField
              label={t("serviceDetails.districts", "الأحياء")}
              value={districtNames}
            />
          </FieldGrid>
        </div>
      </SectionCard>

      <PopupLayout isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <ServiceDetailsEditForm
          data={displayData}
          onSave={onSave}
          onClose={() => setIsPopupOpen(false)}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          onRefetch={onRefetch}
        />
      </PopupLayout>

      <ImagePreviewModal
        imageUrl={previewImage}
        onClose={() => setPreviewImage(null)}
        alt={t("serviceDetails.documentPreview", "Document Preview")}
      />
    </>
  );
};

export default ServiceDetailsSection;
