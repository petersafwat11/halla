"use client";

import { useTranslation } from "react-i18next";
import { getStatusVisual } from "@/utils/statusColors";
import styles from "./VendorDetailsWrapper.module.css";

export default function VendorStatusBadge({ status }) {
  const { t } = useTranslation("adminVendorDetails");

  const labelMap = {
    active: t("status.active"),
    pending: t("status.underReview"),
    approved: t("status.approved"),
    suspended: t("status.suspended"),
    rejected: t("status.rejected"),
  };

  const label = labelMap[status] || labelMap.pending;
  const { fg, bg } = getStatusVisual(status);
  return (
    <span className={styles.statusBadge} style={{ background: bg, color: fg }}>
      {label}
    </span>
  );
}
