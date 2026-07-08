"use client";

import { getStatusVisual } from "@/utils/statusColors";
import styles from "./StatusBadge.module.css";

export default function StatusBadge({ status, statusTextMap }) {
  const { fg, bg } = getStatusVisual(status);
  return (
    <div className={styles.statusBadge} style={{ background: bg, color: fg }}>
      <span>{statusTextMap[status] || status}</span>
    </div>
  );
}
