"use client";

import styles from "./StatusBadge.module.css";

const statusClassMap = {
  approved: styles.statusApproved,
  pending: styles.statusPending,
  rejected: styles.statusRejected,
  suspended: styles.statusSuspended,
};

export default function StatusBadge({ status, statusTextMap }) {
  const colorClass = statusClassMap[status] || styles.statusPending;
  return (
    <div className={`${styles.statusBadge} ${colorClass}`}>
      <span>{statusTextMap[status] || status}</span>
    </div>
  );
}
