"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import UploadFileStandalone from "@/ui/commen/inputs/uploadFile/UploadFileStandalone";
import styles from "./serviceDetailsSection.module.css";

const DocumentUploadsRow = ({
  nationalIdImages,
  setNationalIdImages,
  commercialRecordImages,
  setCommercialRecordImages,
  existingNationalIdImages,
  existingCommercialImages,
  onDeleteNationalId,
  onDeleteCommercial,
  isDeletingNationalId,
  isDeletingCommercial,
}) => {
  const { t } = useTranslation("vendorSettings");

  return (
    <div className={styles.editFormRow}>
      <div className={styles.editFormField}>
        <label className={styles.editFormLabel}>
          {t("serviceDetails.nationalIdImage", t("serviceDetails.otherLicenses", "صورة الهوية الوطنية / الإقامة (اختياري)"))}
        </label>
        <UploadFileStandalone
          value={nationalIdImages}
          onChange={setNationalIdImages}
          multiple={false}
          acceptImages={true}
          existingImages={existingNationalIdImages}
          placeholder={t("serviceDetails.uploadNationalId", t("serviceDetails.uploadLicense", "Upload National ID / Iqama image"))}
          onDeleteExisting={onDeleteNationalId}
          isDeletingExisting={isDeletingNationalId}
        />
      </div>
      <div className={styles.editFormField}>
        <label className={styles.editFormLabel}>{t("serviceDetails.commercialRegister")}</label>
        <UploadFileStandalone
          value={commercialRecordImages}
          onChange={setCommercialRecordImages}
          multiple={false}
          acceptImages={true}
          existingImages={existingCommercialImages}
          placeholder={t("serviceDetails.uploadCommercial", "Upload commercial record")}
          onDeleteExisting={onDeleteCommercial}
          isDeletingExisting={isDeletingCommercial}
        />
      </div>
    </div>
  );
};

export default DocumentUploadsRow;
