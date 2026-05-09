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
}) => {
  const { t } = useTranslation("vendorSettings");

  return (
    <div className={styles.editFormRow}>
      <div className={styles.editFormField}>
        <label className={styles.editFormLabel}>{t("serviceDetails.otherLicenses")}</label>
        <UploadFileStandalone
          value={nationalIdImages}
          onChange={setNationalIdImages}
          multiple={false}
          acceptImages={true}
          existingImages={existingNationalIdImages}
          placeholder={t("serviceDetails.uploadLicense", "Upload license image")}
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
        />
      </div>
    </div>
  );
};

export default DocumentUploadsRow;
