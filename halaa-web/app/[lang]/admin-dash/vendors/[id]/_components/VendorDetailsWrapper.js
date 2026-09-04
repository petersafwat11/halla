"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAdminVendorMutation } from "@/hooks/admin";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import ErrorFallback from "@/ui/common/error/ErrorFallback";
import VendorStatusBadge from "./VendorStatusBadge";
import VendorImageGallery from "./VendorImageGallery";
import VendorSocialLinks from "./VendorSocialLinks";
import VendorServiceCategories from "./VendorServiceCategories";
import VendorActionButtons from "./VendorActionButtons";
import { formatDate } from "@halaa/shared/utils/locale";
import styles from "./VendorDetailsWrapper.module.css";

export default function VendorDetailsWrapper({ vendorData, error }) {
  const router = useRouter();
  const { t, i18n } = useTranslation("adminVendorDetails");
  const updateStatus = useAdminVendorMutation("updateStatus");

  const vendor = vendorData?.vendor || vendorData;
  const roleData = vendor?.vendorData || vendor?.roleData || vendor?.profile?.vendorData || {};

  if (error) {
    return (
      <div className={styles.container}>
        <ErrorFallback
          message={t("errors.loadFailed")}
          onRetry={() => router.back()}
        />
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className={styles.container}>
        <SimpleLoading message={t("loading.vendorData")} />
      </div>
    );
  }

  const currentStatus = roleData?.vendorStatus || vendor?.status;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          {t("actions.backToList")}
        </button>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h1>{roleData?.brandName || t("defaults.vendor")}</h1>
            <p className={styles.ownerName}>
              {roleData?.ownerFullName || vendor?.name}
            </p>
          </div>
          <div className={styles.statusContainer}>
            <VendorStatusBadge status={currentStatus} />
            {roleData?.rating && (
              <span className={styles.rating}>
                {t("rating.display", { rating: roleData.rating })}
              </span>
            )}
            <VendorActionButtons
              vendor={vendor}
              currentStatus={currentStatus}
              updateStatus={updateStatus}
            />
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t("sections.identity")}</h2>
          <div className={styles.cardContent}>
            <InfoRow label={t("identity.brandName")} value={roleData?.brandName} />
            <InfoRow label={t("identity.ownerName")} value={roleData?.ownerFullName || vendor?.name} />
            <InfoRow label={t("identity.email")} value={vendor?.email} />
            <InfoRow label={t("identity.phone")} value={vendor?.phoneNumber} dir="ltr" />
            <InfoRow
              label={t("identity.registrationDate")}
              value={vendor?.createdAt ? formatDate(vendor.createdAt, i18n?.language || "ar") : null}
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t("sections.serviceDescription")}</h2>
          <div className={styles.cardContent}>
            <p className={styles.description}>
              {roleData?.serviceDescription || t("defaults.noDescription")}
            </p>
            {roleData?.otherData && (
              <InfoRow label={t("identity.additionalInfo")} value={roleData.otherData} />
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t("sections.serviceLocation")}</h2>
          <div className={styles.cardContent}>
            {roleData?.serviceLocation ? (
              <>
                <InfoRow label={t("location.region")} value={roleData.serviceLocation.regionNameAr} />
                <InfoRow label={t("location.city")} value={roleData.serviceLocation.cityNameAr} />
                <InfoRow label={t("location.coverageType")} value={roleData.serviceLocation.coverageType} />
              </>
            ) : (
              <p className={styles.noData}>{t("location.noLocation")}</p>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t("sections.commercialVerification")}</h2>
          <div className={styles.cardContent}>
            <InfoRow label={t("verification.commercialRecordNumber")} value={roleData?.commercialRecordNumber} />
            <InfoRow label={t("verification.nationalIdNumber")} value={roleData?.nationalId} />
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t("sections.socialLinks")}</h2>
          <div className={styles.cardContent}>
            <VendorSocialLinks socialLinks={roleData?.socialLinks} />
          </div>
        </div>

        <div className={`${styles.card} ${styles.fullWidth}`}>
          <h2 className={styles.cardTitle}>{t("sections.selectedServices")}</h2>
          <div className={styles.cardContent}>
            <VendorServiceCategories serviceCategories={roleData?.serviceCategories} />
          </div>
        </div>

        <div className={`${styles.card} ${styles.fullWidth}`}>
          <h2 className={styles.cardTitle}>{t("sections.gallery")}</h2>
          <div className={styles.cardContent}>
            <VendorImageGallery roleData={roleData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, dir }) {
  const { t } = useTranslation("adminVendorDetails");
  return (
    <div className={styles.infoRow}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} dir={dir}>
        {value || t("defaults.notAvailable")}
      </span>
    </div>
  );
}
