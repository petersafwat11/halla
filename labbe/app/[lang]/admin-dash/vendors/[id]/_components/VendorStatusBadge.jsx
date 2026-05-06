"use client";

import { useTranslation } from "react-i18next";
import styles from "./VendorDetailsWrapper.module.css";

export default function VendorStatusBadge({ status }) {
  const { t } = useTranslation("adminVendorDetails");

  const statusConfig = {
    active: {
      label: t("status.active"),
      className: styles.statusActive,
    },
    pending: {
      label: t("status.underReview"),
      className: styles.statusPending,
    },
    approved: {
      label: t("status.approved"),
      className: styles.statusApproved,
    },
    suspended: {
      label: t("status.suspended"),
      className: styles.statusSuspended,
    },
    rejected: {
      label: t("status.rejected"),
      className: styles.statusRejected,
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`${styles.statusBadge} ${config.className}`}>
      {config.label}
    </span>
  );
}
