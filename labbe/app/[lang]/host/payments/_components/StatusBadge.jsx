"use client";
import React from "react";
import styles from "./StatusBadge.module.css";

const statusConfig = {
  success: {
    bg: "#EAF4EF",
    color: "#2A8C5B",
  },
  cancelled: {
    bg: "#F9EBEA",
    color: "#C0392B",
  },
  pending: {
    bg: "#FBF3E6",
    color: "#D38200",
  },
};

const StatusBadge = ({ status, text }) => {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div
      className={styles.badge}
      style={{
        background: config.bg,
      }}
    >
      <span style={{ color: config.color }}>{text}</span>
    </div>
  );
};

export default StatusBadge;
