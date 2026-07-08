"use client";
import React from "react";
import { getStatusVisual } from "@/utils/statusColors";
import styles from "./StatusBadge.module.css";

const StatusBadge = ({ status, text }) => {
  const { fg, bg } = getStatusVisual(status, "payment");

  return (
    <div
      className={styles.badge}
      style={{
        background: bg,
      }}
    >
      <span style={{ color: fg }}>{text}</span>
    </div>
  );
};

export default StatusBadge;
